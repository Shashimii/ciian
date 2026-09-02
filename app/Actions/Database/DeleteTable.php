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
    public function __construct(private EloquentModelPath $paths) {}

    /**
     * Delete a table draft: drop the physical table (if published), remove its
     * generated model, then delete the row. Refused when the row's `can_delete`
     * column is false — a flag set once by seeders, never by the app itself, so a
     * table it protects can only come back through the Tables UI by a developer
     * clearing the column directly in the database, not through any code path here.
     * Also refused for any table another published table's foreign key still
     * references.
     */
    public function handle(InternalTable|SystemTable $table): void
    {
        if (! $table->can_delete) {
            throw ValidationException::withMessages([
                'table' => __('This is a protected platform table and cannot be deleted.'),
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
