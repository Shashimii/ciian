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

        // Keyed by column_id, not name, so a rename (same id, new name) is matched to
        // the same column instead of reading as one column dropped and another added.
        $fromColumns = collect($from['columns'])->keyBy('column_id');
        $toColumns = collect($to['columns'])->keyBy('column_id');

        $dropped = $fromColumns->keys()->diff($toColumns->keys());
        $added = $toColumns->keys()->diff($fromColumns->keys());
        $changed = $toColumns->keys()
            ->intersect($fromColumns->keys())
            ->filter(fn (string $id): bool => $this->columnDiffers($fromColumns[$id], $toColumns[$id]));

        $droppedNames = $dropped
            ->map(fn (string $id): string => (string) $fromColumns[$id]['name'])
            ->values();

        // renameColumn() and pure index toggles carry an existing FK constraint along
        // automatically (verified: MariaDB keeps it pointed at the column through a
        // rename). Only a genuine rebuild — the column itself getting a change() — needs
        // its constraint dropped first; dropping it for every "changed" id would delete
        // it before a pure rename, which never calls change() and so never re-adds it.
        $rebuilding = $changed->filter(
            fn (string $id): bool => $this->needsColumnRebuild($fromColumns[$id], $toColumns[$id]),
        );

        // Foreign keys must go before the column they sit on is dropped or rebuilt.
        // Which constraints exist is read from the database, not from the stored shape:
        // DDL is not transactional here, so a partly-applied earlier sync can leave the
        // two disagreeing, and dropping an absent constraint aborts the whole publish.
        // Renamed-but-not-rebuilt columns are still under their old (from) name here.
        $constrainedColumns = $this->foreignKeyColumns($tableName);

        Schema::table($tableName, function (Blueprint $table) use ($fromColumns, $dropped, $rebuilding, $constrainedColumns): void {
            foreach ($dropped->merge($rebuilding) as $id) {
                $physicalName = (string) $fromColumns[$id]['name'];

                if (in_array($physicalName, $constrainedColumns, true)) {
                    $table->dropForeign([$physicalName]);
                }
            }
        });

        // Only columns leaving the shape are dropped; their data is discarded.
        if ($droppedNames->isNotEmpty()) {
            Schema::table($tableName, function (Blueprint $table) use ($droppedNames): void {
                $table->dropColumn($droppedNames->all());
            });
        }

        if ($added->isNotEmpty()) {
            Schema::table($tableName, function (Blueprint $table) use ($toColumns, $added): void {
                foreach ($added as $id) {
                    $this->addColumn($table, $toColumns[$id]);
                }
            });
        }

        // Columns that stay are modified (and renamed) in place so their data survives.
        foreach ($changed as $id) {
            $this->changeColumn($tableName, $fromColumns[$id], $toColumns[$id]);
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
     * Undo a sync that failed partway, returning the physical table to $from.
     *
     * DDL is not transactional on MySQL/MariaDB, so a sync that throws can leave the
     * table stranded between the two shapes, with `pub_shape` then describing columns
     * that no longer match reality. Rather than introspect column definitions back out
     * of the driver — which differs per driver and maps poorly onto our own types —
     * this reconstructs what is live from the only two forms a column can currently
     * hold (its $from form or its $to form), asking the database which name is present,
     * then syncs that reconstruction back to $from.
     *
     * Data in a column the failed sync already dropped does not come back; the column
     * is restored empty. That is unavoidable without a full table copy.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    public function revert(array $from, array $to): void
    {
        $from = $this->shapes->normalize($from);
        $to = $this->shapes->normalize($to);

        if (! Schema::hasTable($from['tbl_db_name'])) {
            return;
        }

        $this->sync($this->liveShape($from, $to), $from);
    }

    /**
     * Best-effort reconstruction of the shape the physical table currently holds,
     * built only from definitions already known to the caller. Used by revert().
     *
     * Both arguments must already be normalized.
     *
     * @param  array{tbl_name: string, tbl_db_name: string, tbl_sys: string, columns: list<array<string, mixed>>, timestamps: bool, primary?: list<string>}  $from
     * @param  array{tbl_name: string, tbl_db_name: string, tbl_sys: string, columns: list<array<string, mixed>>, timestamps: bool, primary?: list<string>}  $to
     * @return array<string, mixed>
     */
    private function liveShape(array $from, array $to): array
    {
        $tableName = $from['tbl_db_name'];
        $fromColumns = collect($from['columns'])->keyBy('column_id');
        $toColumns = collect($to['columns'])->keyBy('column_id');

        $columns = [];

        foreach ($fromColumns->keys()->merge($toColumns->keys())->unique() as $id) {
            // The $to form is tried first: wherever the sync managed to rename or
            // rebuild a column, that is the form now in the database. Where it did
            // neither, both forms carry the same name and describe it equally well.
            foreach ([$toColumns[$id] ?? null, $fromColumns[$id] ?? null] as $candidate) {
                if ($candidate === null) {
                    continue;
                }

                if (Schema::hasColumn($tableName, (string) $candidate['name'])) {
                    $columns[] = $candidate;

                    break;
                }
            }
        }

        return [
            'tbl_name' => $from['tbl_name'],
            'tbl_db_name' => $tableName,
            'tbl_sys' => $from['tbl_sys'],
            'columns' => $columns,
            'timestamps' => Schema::hasColumn($tableName, 'created_at'),
        ];
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

        // Matched by column_id: a rename must never be reported as a drop.
        $toIds = array_map(
            static fn (array $column): string => (string) ($column['column_id'] ?? ''),
            $to['columns'],
        );

        $names = [];

        foreach ($from['columns'] as $column) {
            $id = (string) ($column['column_id'] ?? '');

            if (! in_array($id, $toIds, true)) {
                $names[] = (string) ($column['name'] ?? '');
            }
        }

        return $names;
    }

    /**
     * Columns `sync()` will touch in some way — matched by column_id, wherever the
     * definition genuinely differs (a pure rename with nothing else changed is
     * excluded, since it can't lose data). This is deliberately broader than "needs
     * a change() rebuild": a pure unique/indexed toggle is included too, because it
     * still becomes its own ALTER statement in `syncIndexes()` and can just as well
     * reject existing data (a duplicate value can't become UNIQUE) even though it
     * never touches the column's own definition. Everything else in a sync either
     * adds new data-free columns or drops columns the user already confirmed.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<array{from: array<string, mixed>, to: array<string, mixed>}>
     */
    public function columnsChanged(array $from, array $to): array
    {
        $from = $this->shapes->normalize($from);
        $to = $this->shapes->normalize($to);

        $fromColumns = collect($from['columns'])->keyBy('column_id');
        $toColumns = collect($to['columns'])->keyBy('column_id');

        $pairs = [];

        foreach ($toColumns->keys()->intersect($fromColumns->keys()) as $id) {
            $fromColumn = $fromColumns[$id];
            $toColumn = $toColumns[$id];

            if ($this->columnDiffers($fromColumn, $toColumn)) {
                $pairs[] = ['from' => $fromColumn, 'to' => $toColumn];
            }
        }

        return $pairs;
    }

    /**
     * Modify an existing column in place, preserving the data it already holds.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    private function changeColumn(string $tableName, array $from, array $to): void
    {
        $fromName = (string) $from['name'];
        $toName = (string) $to['name'];

        // The live column is still under its old name until renameColumn() runs below.
        $live = $this->liveIndexes($tableName)[$fromName] ?? null;

        Schema::table($tableName, function (Blueprint $table) use ($from, $to, $fromName, $toName, $live): void {
            if ($fromName !== $toName) {
                $table->renameColumn($fromName, $toName);
            }

            // change() never touches indexes, so they are reconciled separately.
            $this->syncIndexes($table, $toName, $live, $this->indexStateFor($to));

            if (! $this->needsColumnRebuild($from, $to)) {
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
        // MariaDB auto-creates an index to back each foreign key, sharing the
        // constraint's name. The Tables UI never asked for that index, and it can't
        // be dropped while the constraint needs it — exclude it from what this method
        // reports as manageable, or syncIndexes() will try to drop it and MariaDB
        // will refuse ("needed in a foreign key constraint").
        $foreignKeyIndexNames = [];

        foreach (Schema::getForeignKeys($tableName) as $foreignKey) {
            $foreignKeyIndexNames[] = (string) $foreignKey['name'];
        }

        $states = [];

        foreach (Schema::getIndexes($tableName) as $index) {
            if ($index['primary'] || count($index['columns']) !== 1) {
                continue;
            }

            if (in_array($index['name'], $foreignKeyIndexNames, true)) {
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
     * Whether the column definition itself needs re-declaring via change().
     *
     * False when the only differences are the identity/name (renameColumn() already
     * handles that) or index membership (syncIndexes() already handles that) — issuing
     * a change() for either would just be a redundant no-op MODIFY.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     */
    private function needsColumnRebuild(array $from, array $to): bool
    {
        $strip = function (array $column): array {
            $column = $this->canonicalColumn($column);

            unset($column['name'], $column['column_id']);

            foreach (ColumnTypes::UNIVERSAL_OPTIONS as $option) {
                unset($column[$option]);
            }

            return $column;
        };

        return $strip($from) !== $strip($to);
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
