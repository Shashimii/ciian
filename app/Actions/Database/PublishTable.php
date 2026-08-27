<?php

namespace App\Actions\Database;

use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\ApplyTableSchema;
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
        private GenerateEloquentModel $generateModel,
    ) {}

    /**
     * Publish or sync a table draft: apply DDL + FKs, copy unpub_shape → pub_shape, status=published.
     */
    public function handle(InternalTable|SystemTable $table): InternalTable|SystemTable
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

        $tableName = $normalized['tbl_db_name'];
        $created = false;

        try {
            if ($isSync) {
                $this->schema->sync(
                    is_array($table->pub_shape) ? $table->pub_shape : [],
                    $normalized,
                );
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
            if ($created && Schema::hasTable($tableName)) {
                Schema::drop($tableName);
            }

            throw ValidationException::withMessages([
                'shape' => $exception instanceof RuntimeException
                    ? $exception->getMessage()
                    : __('Publishing failed: :message', ['message' => $exception->getMessage()]),
            ]);
        }
    }
}
