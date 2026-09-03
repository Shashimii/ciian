<?php

namespace App\Actions\Database;

use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\ApplyTableSchema;
use App\Support\TableChangeInspector;
use App\Support\TableShapeBuilder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class PublishTable
{
    public function __construct(
        private TableShapeBuilder $shapes,
        private ApplyTableSchema $schema,
        private TableChangeInspector $inspector,
        private GenerateEloquentModel $generateModel,
    ) {}

    /**
     * Publish or sync a table draft: apply DDL + FKs, copy unpub_shape → pub_shape, status=published.
     *
     * Dropping a column destroys its data, so a sync that removes one is refused
     * until the caller confirms it.
     */
    public function handle(InternalTable|SystemTable $table, bool $confirmedDrops = false): InternalTable|SystemTable
    {
        $shape = $table->unpub_shape;

        if (! is_array($shape) || $shape === []) {
            throw ValidationException::withMessages([
                'shape' => __('This table has no draft shape to publish.'),
            ]);
        }

        try {
            $normalized = $this->shapes->normalize($shape);
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        $isSync = $table->isPublished();

        if ($isSync && ! $table->hasPendingChanges()) {
            throw ValidationException::withMessages([
                'shape' => __('This table has no pending changes to sync.'),
            ]);
        }

        if ($isSync && ! $confirmedDrops) {
            $dropped = $this->schema->droppedColumns(
                is_array($table->pub_shape) ? $table->pub_shape : [],
                $normalized,
            );

            if ($dropped !== []) {
                throw ValidationException::withMessages([
                    'shape' => __('Publishing permanently deletes :columns and all data stored in them.', [
                        'columns' => implode(', ', $dropped),
                    ]),
                ]);
            }
        }

        if ($isSync) {
            $blocked = $this->inspector->findBlockingChanges(
                $normalized['tbl_db_name'],
                is_array($table->pub_shape) ? $table->pub_shape : [],
                $normalized,
            );

            if ($blocked !== []) {
                throw ValidationException::withMessages([
                    'shape' => implode("\n", $blocked),
                ]);
            }
        }

        $tableName = $normalized['tbl_db_name'];
        $publishedShape = is_array($table->pub_shape) ? $table->pub_shape : [];
        $created = false;

        try {
            if ($isSync) {
                $this->schema->sync($publishedShape, $normalized);
            } else {
                $this->schema->create($normalized);
                $created = true;
            }

            $this->generateModel->handle($table, $normalized);

            $table->unpub_shape = $normalized;
            $table->pub_shape = $normalized;
            $table->status = $table instanceof InternalTable
                ? InternalTable::STATUS_PUBLISHED
                : SystemTable::STATUS_PUBLISHED;
            $table->save();

            return $table->refresh();
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            $restoreFailure = null;

            if ($created && Schema::hasTable($tableName)) {
                Schema::drop($tableName);
            } elseif ($isSync && $publishedShape !== []) {
                // DDL is not transactional on MySQL/MariaDB, so a sync that throws
                // partway leaves the table stranded between the two shapes while
                // pub_shape still describes the old one. Put the table back on the
                // published shape so the two never disagree; the draft in unpub_shape
                // is untouched, so the user can fix it and sync again.
                try {
                    $this->schema->revert($publishedShape, $normalized);
                } catch (Throwable $restoreException) {
                    $restoreFailure = $restoreException->getMessage();
                }
            }

            throw ValidationException::withMessages([
                'shape' => $this->failureMessage($exception, $isSync, $restoreFailure),
            ]);
        }
    }

    /**
     * Explain a failed publish or sync, and say what state the table was left in —
     * the user's next move differs entirely depending on whether it was restored.
     */
    private function failureMessage(Throwable $exception, bool $isSync, ?string $restoreFailure): string
    {
        $reason = $exception->getMessage();

        if (! $isSync) {
            return $exception instanceof RuntimeException
                ? $reason
                : __('Publishing failed: :message', ['message' => $reason]);
        }

        if ($restoreFailure !== null) {
            return __('Sync failed: :message', ['message' => $reason])
                ."\n\n"
                .__('The table could not be restored to its published state either: :message', [
                    'message' => $restoreFailure,
                ])
                ."\n\n"
                .__('It may now be partly changed. Compare it against the published shape before syncing again.');
        }

        return __('Sync failed, so the table was left on its published shape. :message', [
            'message' => $reason,
        ]);
    }
}
