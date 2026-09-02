<?php

namespace App\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;
use Illuminate\Database\Schema\ForeignIdColumnDefinition;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * Applies a normalized table shape as physical DDL (create or sync) including FKs.
 */
class ApplyTableSchema
{
    public function __construct(private TableShapeBuilder $shapes) {}

    /**
     * Create a physical table from an unpublished shape.
     *
     * @param  array<string, mixed>  $shape
     */
    public function create(array $shape): void
    {
        $shape = $this->shapes->normalize($shape);
        $this->shapes->validate($shape);

        $tableName = $shape['tbl_db_name'];

        if (Schema::hasTable($tableName)) {
            throw new RuntimeException(
                "Physical table [{$tableName}] already exists and cannot be published as a new table.",
            );
        }

        Schema::create($tableName, function (Blueprint $table) use ($shape): void {
            foreach ($shape['columns'] as $column) {
                $this->addColumn($table, $column);
            }

            if ($shape['timestamps'] ?? true) {
                $table->timestamps();
            }

            if (isset($shape['primary']) && is_array($shape['primary']) && $shape['primary'] !== []) {
                $hasIncrementingKey = collect($shape['columns'])->contains(
                    fn (array $column): bool => ColumnTypes::isIncrementingKey($column['type'] ?? ''),
                );

                if (! $hasIncrementingKey) {
                    $table->primary($shape['primary']);
                }
            }
        });
    }

    /**
     * Sync an existing physical table toward a new shape (add/drop columns and FKs).
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    public function sync(array $from, array $to): void
    {
        $from = $this->shapes->normalize($from);
        $to = $this->shapes->normalize($to);
        $this->shapes->validate($to);

        $tableName = $to['tbl_db_name'];

        if ($from['tbl_db_name'] === '') {
            $from['tbl_db_name'] = $tableName;
        }

        if ($from['tbl_db_name'] !== $to['tbl_db_name']) {
            throw new RuntimeException('Renaming the physical table is not supported during sync.');
        }

        if (! Schema::hasTable($tableName)) {
            $this->create($to);

            return;
        }

        $fromColumns = collect($from['columns'])->keyBy('name');
        $toColumns = collect($to['columns'])->keyBy('name');

        $dropped = $fromColumns->keys()->diff($toColumns->keys());
        $added = $toColumns->keys()->diff($fromColumns->keys());
        $changed = $toColumns->keys()
            ->intersect($fromColumns->keys())
            ->filter(fn (string $name): bool => $this->columnDiffers($fromColumns[$name], $toColumns[$name]));

        // Foreign keys must go before the column they sit on is dropped or modified.
        // Which constraints exist is read from the database, not from the stored shape:
        // DDL is not transactional here, so a partly-applied earlier sync can leave the
        // two disagreeing, and dropping an absent constraint aborts the whole publish.
        $constrainedColumns = $this->foreignKeyColumns($tableName);

        Schema::table($tableName, function (Blueprint $table) use ($dropped, $changed, $constrainedColumns): void {
            foreach ($dropped->merge($changed) as $name) {
                if (in_array($name, $constrainedColumns, true)) {
                    $table->dropForeign([$name]);
                }
            }
        });

        // Only columns leaving the shape are dropped; their data is discarded.
        if ($dropped->isNotEmpty()) {
            Schema::table($tableName, function (Blueprint $table) use ($dropped): void {
                $table->dropColumn($dropped->all());
            });
        }

        if ($added->isNotEmpty()) {
            Schema::table($tableName, function (Blueprint $table) use ($toColumns, $added): void {
                foreach ($added as $name) {
                    $this->addColumn($table, $toColumns[$name]);
                }
            });
        }

        // Columns that stay are modified in place so their existing data survives.
        foreach ($changed as $name) {
            $this->changeColumn($tableName, $fromColumns[$name], $toColumns[$name]);
        }

        $fromTimestamps = (bool) ($from['timestamps'] ?? true);
        $toTimestamps = (bool) ($to['timestamps'] ?? true);

        if ($fromTimestamps !== $toTimestamps) {
            Schema::table($tableName, function (Blueprint $table) use ($toTimestamps): void {
                if ($toTimestamps) {
                    $table->timestamps();
                } else {
                    $table->dropTimestamps();
                }
            });
        }
    }

    /**
     * Column names that a sync from one shape to another would drop, discarding their data.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    public function droppedColumns(array $from, array $to): array
    {
        if ($from === [] || ! Schema::hasTable($this->shapes->physicalTableName($from))) {
            return [];
        }

        $from = $this->shapes->normalize($from);
        $to = $this->shapes->normalize($to);

        $names = static fn (array $columns): array => array_map(
            static fn (array $column): string => (string) ($column['name'] ?? ''),
            $columns,
        );

        return array_values(array_diff($names($from['columns']), $names($to['columns'])));
    }

    /**
     * Modify an existing column in place, preserving the data it already holds.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    private function changeColumn(string $tableName, array $from, array $to): void
    {
        $name = (string) $to['name'];
        $live = $this->liveIndexes($tableName)[$name] ?? null;

        Schema::table($tableName, function (Blueprint $table) use ($from, $to, $name, $live): void {
            // change() never touches indexes, so they are reconciled separately.
            $this->syncIndexes($table, $name, $live, $this->indexStateFor($to));

            if ($this->onlyIndexesDiffer($from, $to)) {
                return;
            }

            $this->addColumn($table, $to, change: true);
        });
    }

    /**
     * Reconcile one column's index against what the database actually has.
     *
     * @param  array{state: 'unique'|'index', name: string}|null  $live
     * @param  'unique'|'index'|'none'  $wanted
     */
    private function syncIndexes(Blueprint $table, string $name, ?array $live, string $wanted): void
    {
        if (($live['state'] ?? 'none') === $wanted) {
            return;
        }

        // Dropped by its real name: an index backing a foreign key is named
        // <table>_<column>_foreign, not the conventional <table>_<column>_index.
        if ($live !== null) {
            match ($live['state']) {
                'unique' => $table->dropUnique($live['name']),
                'index' => $table->dropIndex($live['name']),
            };
        }

        match ($wanted) {
            'unique' => $table->unique($name),
            'index' => $table->index($name),
            default => null,
        };
    }

    /**
     * Single-column indexes the table actually carries, keyed by column name.
     *
     * @return array<string, array{state: 'unique'|'index', name: string}>
     */
    private function liveIndexes(string $tableName): array
    {
        $states = [];

        foreach (Schema::getIndexes($tableName) as $index) {
            if ($index['primary'] || count($index['columns']) !== 1) {
                continue;
            }

            $column = (string) $index['columns'][0];

            // A unique index outranks a plain one when a column carries both.
            if (($states[$column]['state'] ?? null) === 'unique') {
                continue;
            }

            $states[$column] = [
                'state' => $index['unique'] ? 'unique' : 'index',
                'name' => (string) $index['name'],
            ];
        }

        return $states;
    }

    /**
     * Columns the table actually has a foreign key on.
     *
     * @return list<string>
     */
    private function foreignKeyColumns(string $tableName): array
    {
        $columns = [];

        foreach (Schema::getForeignKeys($tableName) as $foreignKey) {
            foreach ($foreignKey['columns'] as $column) {
                $columns[] = (string) $column;
            }
        }

        return array_values(array_unique($columns));
    }

    /**
     * Unique wins over indexed, mirroring how addColumn() builds a new column.
     *
     * @param  array<string, mixed>  $column
     * @return 'unique'|'index'|'none'
     */
    private function indexStateFor(array $column): string
    {
        if ($column['unique'] ?? false) {
            return 'unique';
        }

        if ($column['indexed'] ?? false) {
            return 'index';
        }

        return 'none';
    }

    /**
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    private function columnDiffers(array $from, array $to): bool
    {
        return $this->canonicalColumn($from) !== $this->canonicalColumn($to);
    }

    /**
     * Whether the only difference is index membership, which needs no column change.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    private function onlyIndexesDiffer(array $from, array $to): bool
    {
        $strip = function (array $column): array {
            $column = $this->canonicalColumn($column);

            foreach (ColumnTypes::UNIVERSAL_OPTIONS as $option) {
                unset($column[$option]);
            }

            return $column;
        };

        return $strip($from) === $strip($to);
    }

    /**
     * Fill implied defaults and sort keys so equivalent columns compare equal.
     *
     * Without this, a column whose `unique` key is absent differs from the same
     * column carrying `unique: false`, and a no-op edit would rewrite it.
     *
     * @param  array<string, mixed>  $column
     * @return array<string, mixed>
     */
    private function canonicalColumn(array $column): array
    {
        foreach (ColumnTypes::UNIVERSAL_OPTIONS as $option) {
            $column[$option] = (bool) ($column[$option] ?? false);
        }

        $column['nullable'] = (bool) ($column['nullable'] ?? false);

        ksort($column);

        return $column;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function addColumn(Blueprint $table, array $column, bool $change = false): void
    {
        $type = (string) ($column['type'] ?? '');
        $name = (string) ($column['name'] ?? '');

        if ($type === '' || $name === '') {
            throw new InvalidArgumentException('Each column requires a name and type.');
        }

        $definition = $this->buildColumnDefinition($table, $type, $name, $column);

        if ($definition === null) {
            return;
        }

        if (($column['nullable'] ?? false) && ColumnTypes::supports($type, 'nullable')) {
            $definition->nullable();
        }

        if (array_key_exists('default', $column) && ColumnTypes::supports($type, 'default') && $column['default'] !== null && $column['default'] !== '') {
            $definition->default($column['default']);
        }

        if (($column['unsigned'] ?? false) && ColumnTypes::supports($type, 'unsigned')) {
            $definition->unsigned();
        }

        if (($column['use_current'] ?? false) && ColumnTypes::supports($type, 'use_current')) {
            $definition->useCurrent();
        }

        if (($column['use_current_on_update'] ?? false) && ColumnTypes::supports($type, 'use_current_on_update')) {
            $definition->useCurrentOnUpdate();
        }

        // When changing, syncIndexes() owns index membership; change() ignores it anyway.
        if (! $change) {
            if (($column['unique'] ?? false)) {
                $definition->unique();
            } elseif (($column['indexed'] ?? false)) {
                $definition->index();
            }
        } else {
            $definition->change();
        }

        if (ColumnTypes::isForeignKey($type)) {
            $this->applyForeignKey($definition, $column);
        }
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function buildColumnDefinition(
        Blueprint $table,
        string $type,
        string $name,
        array $column,
    ): ?ColumnDefinition {
        return match ($type) {
            'id' => $table->id($name),
            'increments' => $table->increments($name),
            'tinyIncrements' => $table->tinyIncrements($name),
            'smallIncrements' => $table->smallIncrements($name),
            'mediumIncrements' => $table->mediumIncrements($name),
            'bigIncrements' => $table->bigIncrements($name),
            'integer' => $this->maybeAutoIncrement($table->integer($name), $column),
            'tinyInteger' => $this->maybeAutoIncrement($table->tinyInteger($name), $column),
            'smallInteger' => $this->maybeAutoIncrement($table->smallInteger($name), $column),
            'mediumInteger' => $this->maybeAutoIncrement($table->mediumInteger($name), $column),
            'bigInteger' => $this->maybeAutoIncrement($table->bigInteger($name), $column),
            'unsignedInteger' => $this->maybeAutoIncrement($table->unsignedInteger($name), $column),
            'unsignedTinyInteger' => $this->maybeAutoIncrement($table->unsignedTinyInteger($name), $column),
            'unsignedSmallInteger' => $this->maybeAutoIncrement($table->unsignedSmallInteger($name), $column),
            'unsignedMediumInteger' => $this->maybeAutoIncrement($table->unsignedMediumInteger($name), $column),
            'unsignedBigInteger' => $this->maybeAutoIncrement($table->unsignedBigInteger($name), $column),
            'decimal' => $table->decimal(
                $name,
                isset($column['precision']) ? (int) $column['precision'] : 8,
                isset($column['scale']) ? (int) $column['scale'] : 2,
            ),
            'float' => $table->float(
                $name,
                isset($column['precision']) ? (int) $column['precision'] : 53,
            ),
            'double' => $table->double($name),
            'string' => isset($column['length']) && $column['length'] !== '' && $column['length'] !== null
                ? $table->string($name, (int) $column['length'])
                : $table->string($name),
            'char' => isset($column['length']) && $column['length'] !== '' && $column['length'] !== null
                ? $table->char($name, (int) $column['length'])
                : $table->char($name),
            'text' => $table->text($name),
            'tinyText' => $table->tinyText($name),
            'mediumText' => $table->mediumText($name),
            'longText' => $table->longText($name),
            'boolean' => $table->boolean($name),
            'date' => $table->date($name),
            'dateTime' => isset($column['precision'])
                ? $table->dateTime($name, (int) $column['precision'])
                : $table->dateTime($name),
            'dateTimeTz' => isset($column['precision'])
                ? $table->dateTimeTz($name, (int) $column['precision'])
                : $table->dateTimeTz($name),
            'time' => isset($column['precision'])
                ? $table->time($name, (int) $column['precision'])
                : $table->time($name),
            'timeTz' => isset($column['precision'])
                ? $table->timeTz($name, (int) $column['precision'])
                : $table->timeTz($name),
            'timestamp' => isset($column['precision'])
                ? $table->timestamp($name, (int) $column['precision'])
                : $table->timestamp($name),
            'timestampTz' => isset($column['precision'])
                ? $table->timestampTz($name, (int) $column['precision'])
                : $table->timestampTz($name),
            'year' => $table->year($name),
            'binary' => $table->binary($name),
            'json' => $table->json($name),
            'jsonb' => $table->jsonb($name),
            'uuid' => $table->uuid($name),
            'ulid' => $table->ulid($name),
            'foreignId' => $table->foreignId($name),
            'foreignUlid' => $table->foreignUlid($name),
            'foreignUuid' => $table->foreignUuid($name),
            'enum' => $table->enum($name, array_values(array_map('strval', $column['values'] ?? []))),
            'set' => $table->set($name, array_values(array_map('strval', $column['values'] ?? []))),
            'ipAddress' => $table->ipAddress($name),
            'macAddress' => $table->macAddress($name),
            'rememberToken' => $this->addRememberToken($table),
            'softDeletes' => $this->addSoftDeletes($table, $name, $column, tz: false),
            'softDeletesTz' => $this->addSoftDeletes($table, $name, $column, tz: true),
            'vector' => isset($column['dimensions'])
                ? $table->vector($name, (int) $column['dimensions'])
                : $table->vector($name),
            'geometry' => $table->geometry($name),
            'geography' => $table->geography($name),
            default => throw new InvalidArgumentException("Unsupported column type [{$type}]."),
        };
    }

    private function addRememberToken(Blueprint $table): ?ColumnDefinition
    {
        $table->rememberToken();

        return null;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function addSoftDeletes(Blueprint $table, string $name, array $column, bool $tz): ?ColumnDefinition
    {
        if ($tz) {
            isset($column['precision'])
                ? $table->softDeletesTz($name, (int) $column['precision'])
                : $table->softDeletesTz($name);
        } else {
            isset($column['precision'])
                ? $table->softDeletes($name, (int) $column['precision'])
                : $table->softDeletes($name);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function maybeAutoIncrement(ColumnDefinition $definition, array $column): ColumnDefinition
    {
        if ($column['auto_increment'] ?? false) {
            $definition->autoIncrement();
        }

        return $definition;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function applyForeignKey(ColumnDefinition $definition, array $column): void
    {
        $references = (string) ($column['references'] ?? '');

        if (! preg_match('/^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/', $references, $matches)) {
            throw new InvalidArgumentException(
                "Foreign key [{$column['name']}] requires references as table.column.",
            );
        }

        if (! $definition instanceof ForeignIdColumnDefinition) {
            throw new InvalidArgumentException(
                "Foreign key [{$column['name']}] must be built from a foreign key column type.",
            );
        }

        // constrained() returns the ForeignKeyDefinition. The on-delete action belongs on
        // that, not on the column: ColumnDefinition is a bare Fluent, so calling it there
        // just sets an unused attribute and the ON DELETE clause is silently dropped.
        $foreign = $definition->constrained($matches[1], $matches[2]);

        match ($column['on_delete'] ?? 'restrict') {
            'cascade' => $foreign->cascadeOnDelete(),
            'set_null' => $foreign->nullOnDelete(),
            'no_action' => $foreign->noActionOnDelete(),
            default => $foreign->restrictOnDelete(),
        };
    }
}
