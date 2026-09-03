<?php

namespace App\Actions\Database;

use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\EloquentModelPath;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class DeleteTable
{
    public function __construct(
        private EloquentModelPath $paths,
        private GenerateEloquentModel $generateModel,
    ) {}

    /**
     * Delete a table draft: drop the physical table (if published), remove its
     * generated model, then delete the row.
     *
     * Refused unconditionally when the row's `can_delete` column is false — no
     * confirmation, password included, overrides that; it can only come back through
     * a developer clearing the column directly in the database. Unlike delete, a sync
     * (`PublishTable`) is still allowed on a protected table, so this flag only ever
     * blocks this one action.
     *
     * Otherwise, when the row is currently published — it has a live physical table,
     * on either the internal or a created-system store — $confirmedPassword must be
     * true. The caller (`TableController`) is responsible for verifying the current
     * user's password first; this method trusts that flag rather than re-verifying,
     * the same way `PublishTable::handle()` trusts `$confirmedDrops`. An unpublished
     * draft needs no confirmation: nothing physical exists yet to lose.
     *
     * Also refused for any table another published table's foreign key still
     * references, regardless of confirmation.
     */
    public function handle(InternalTable|SystemTable $table, bool $confirmedPassword = false): void
    {
        if (! $table->can_delete) {
            throw ValidationException::withMessages([
                'table' => __('This is a protected platform table and cannot be deleted.'),
            ]);
        }

        if ($table->isPublished() && ! $confirmedPassword) {
            throw ValidationException::withMessages([
                'root_password' => __('This table is published. Confirm your password to delete it.'),
            ]);
        }

        $shape = $this->currentShape($table);
        $target = $this->paths->forShape($table, $shape);
        $physical = $target['table'];

        if ($physical !== '') {
            $referencedBy = $this->referencingTables($physical);

            if ($referencedBy !== []) {
                throw ValidationException::withMessages([
                    'table' => __('Cannot delete this table: :tables still reference it.', [
                        'tables' => implode(', ', $referencedBy),
                    ]),
                ]);
            }
        }

        try {
            if ($physical !== '' && Schema::hasTable($physical)) {
                Schema::drop($physical);
            }

            $this->generateModel->handleDeletion($table, $shape);

            if (! $target['skip'] && $target['path'] !== null && File::exists($target['path'])) {
                File::delete($target['path']);
            }

            $table->delete();
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'table' => __('Failed to delete table: :message', ['message' => $exception->getMessage()]),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function currentShape(InternalTable|SystemTable $table): array
    {
        if (is_array($table->pub_shape)) {
            return $table->pub_shape;
        }

        if (is_array($table->unpub_shape)) {
            return $table->unpub_shape;
        }

        return [];
    }

    /**
     * Physical tables whose live foreign keys point at $physical. Checked against
     * the database, not stored shapes, so it reflects what would actually break.
     *
     * @return list<string>
     */
    private function referencingTables(string $physical): array
    {
        $referencing = [];

        foreach (Schema::getTables() as $tableInfo) {
            $name = (string) $tableInfo['name'];

            if ($name === $physical) {
                continue;
            }

            foreach (Schema::getForeignKeys($name) as $foreignKey) {
                if (Str::lower((string) $foreignKey['foreign_table']) === $physical) {
                    $referencing[] = $name;

                    break;
                }
            }
        }

        return array_values(array_unique($referencing));
    }
}
