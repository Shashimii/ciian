<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Builds and normalizes database table shapes for ciian_int_tbl / ciian_sys_tbl.
 *
 * @see .ai/shapes/db_table_format.md
 */
class TableShapeBuilder
{
    /**
     * CamelCase → snake_case aliases accepted from older or UI payloads.
     *
     * @var array<string, string>
     */
    private const COLUMN_KEY_ALIASES = [
        'autoIncrement' => 'auto_increment',
        'useCurrent' => 'use_current',
        'useCurrentOnUpdate' => 'use_current_on_update',
        'onDelete' => 'on_delete',
    ];

    /**
     * Build a new table shape from explicit parts.
     *
     * @param  list<array<string, mixed>>  $columns
     * @param  list<string>|null  $primary
     * @return array{
     *     tbl_name: string,
     *     tbl_db_name: string,
     *     tbl_sys: string,
     *     columns: list<array<string, mixed>>,
     *     timestamps: bool,
     *     primary?: list<string>
     * }
     */
    public function make(
        string $tblName,
        string $tblDbName,
        string $tblSys,
        array $columns = [],
        bool $timestamps = true,
        ?array $primary = null,
    ): array {
        $shape = [
            'tbl_name' => $tblName,
            'tbl_db_name' => $tblDbName,
            'tbl_sys' => $tblSys,
            'columns' => $columns === [] ? [$this->defaultIdColumn()] : $columns,
            'timestamps' => $timestamps,
        ];

        if ($primary !== null) {
            $shape['primary'] = $primary;
        }

        return $this->normalize($shape);
    }

    /**
     * Normalize a raw shape (seed data, UI payload, or stored JSON) into canonical form.
     *
     * @param  array<string, mixed>  $shape
     * @return array{
     *     tbl_name: string,
     *     tbl_db_name: string,
     *     tbl_sys: string,
     *     columns: list<array<string, mixed>>,
     *     timestamps: bool,
     *     primary?: list<string>
     * }
     */
    public function normalize(array $shape): array
    {
        $normalized = [
            'tbl_name' => (string) ($shape['tbl_name'] ?? ''),
            'tbl_db_name' => $this->physicalTableName($shape),
            'tbl_sys' => (string) ($shape['tbl_sys'] ?? ''),
            'columns' => [],
            'timestamps' => (bool) ($shape['timestamps'] ?? true),
        ];

        $columns = $shape['columns'] ?? [];

        if (! is_array($columns)) {
            throw new InvalidArgumentException('Table shape columns must be an array.');
        }

        foreach ($columns as $column) {
            if (! is_array($column)) {
                throw new InvalidArgumentException('Each table shape column must be an object/array.');
            }

            $normalized['columns'][] = $this->normalizeColumn($column);
        }

        if (isset($shape['primary']) && is_array($shape['primary'])) {
            $normalized['primary'] = array_values(array_map('strval', $shape['primary']));
        }

        return $normalized;
    }

    /**
     * Normalize a single column definition.
     *
     * @param  array<string, mixed>  $column
     * @return array<string, mixed>
     */
    public function normalizeColumn(array $column): array
    {
        $column = $this->applyColumnKeyAliases($column);

        $type = (string) ($column['type'] ?? '');
        $name = (string) ($column['name'] ?? '');

        $normalized = [
            'column_id' => $this->resolveColumnId($column, $name),
            'name' => $name,
            'type' => $type,
        ];

        if ($type === '' || ! ColumnTypes::isValid($type)) {
            return $this->preserveUnknownColumn($column, $normalized);
        }

        if (array_key_exists('nullable', $column) && ColumnTypes::supports($type, 'nullable')) {
            $normalized['nullable'] = (bool) $column['nullable'];
        }

        if (array_key_exists('auto_increment', $column) && ColumnTypes::supports($type, 'auto_increment')) {
            $normalized['auto_increment'] = (bool) $column['auto_increment'];
        }

        foreach (['default', 'length', 'precision', 'scale', 'dimensions', 'references'] as $option) {
            if (array_key_exists($option, $column) && ColumnTypes::supports($type, $option)) {
                $normalized[$option] = $column[$option];
            }
        }

        foreach (['unsigned', 'use_current', 'use_current_on_update'] as $option) {
            if (array_key_exists($option, $column) && ColumnTypes::supports($type, $option)) {
                $normalized[$option] = (bool) $column[$option];
            }
        }

        if (array_key_exists('values', $column) && ColumnTypes::supports($type, 'values')) {
            $values = $column['values'];
            $normalized['values'] = is_array($values)
                ? array_values(array_map('strval', $values))
                : [];
        }

        if (array_key_exists('on_delete', $column) && ColumnTypes::supports($type, 'on_delete')) {
            $normalized['on_delete'] = $this->normalizeOnDelete((string) $column['on_delete']);
        }

        foreach (ColumnTypes::UNIVERSAL_OPTIONS as $option) {
            if (array_key_exists($option, $column)) {
                $normalized[$option] = (bool) $column[$option];
            }
        }

        return $normalized;
    }

    /**
     * Locked auto-increment primary key column used by the Tables UI on create.
     *
     * @return array{name: string, type: string, nullable: bool, auto_increment: bool}
     */
    public function defaultIdColumn(): array
    {
        return [
            'name' => 'id',
            'type' => 'id',
            'nullable' => false,
            'auto_increment' => true,
        ];
    }

    /**
     * Resolve the physical database table name from a shape.
     *
     * Prefers `tbl_db_name`; falls back to legacy `physical_table`.
     *
     * @param  array<string, mixed>  $shape
     */
    public function physicalTableName(array $shape): string
    {
        if (! empty($shape['tbl_db_name']) && is_string($shape['tbl_db_name'])) {
            return $shape['tbl_db_name'];
        }

        if (! empty($shape['physical_table']) && is_string($shape['physical_table'])) {
            return $shape['physical_table'];
        }

        return '';
    }

    /**
     * Validate a (preferably normalized) shape; throws on structural problems.
     *
     * @param  array<string, mixed>  $shape
     *
     * @throws InvalidArgumentException
     */
    public function validate(array $shape): void
    {
        $shape = $this->normalize($shape);

        if ($shape['tbl_name'] === '') {
            throw new InvalidArgumentException('Table shape requires tbl_name.');
        }

        if ($shape['tbl_db_name'] === '' || ! $this->isSnakeCaseIdentifier($shape['tbl_db_name'])) {
            throw new InvalidArgumentException('Table shape requires a snake_case tbl_db_name.');
        }

        if ($shape['tbl_sys'] === '') {
            throw new InvalidArgumentException('Table shape requires tbl_sys.');
        }

        if ($shape['columns'] === []) {
            throw new InvalidArgumentException('Table shape requires at least one column.');
        }

        $names = [];
        $columnIds = [];

        foreach ($shape['columns'] as $index => $column) {
            $name = $column['name'] ?? '';
            $type = $column['type'] ?? '';
            $columnId = $column['column_id'] ?? '';

            if ($name === '' || ! $this->isSnakeCaseIdentifier($name)) {
                throw new InvalidArgumentException("Column at index {$index} requires a snake_case name.");
            }

            if (! ColumnTypes::isValid($type)) {
                throw new InvalidArgumentException("Column [{$name}] has unknown type [{$type}].");
            }

            if (isset($names[$name])) {
                throw new InvalidArgumentException("Duplicate column name [{$name}].");
            }

            if (isset($columnIds[$columnId])) {
                throw new InvalidArgumentException("Column [{$name}] has a duplicate column_id.");
            }

            $names[$name] = true;
            $columnIds[$columnId] = true;

            if (ColumnTypes::isForeignKey($type)) {
                $references = $column['references'] ?? null;

                if (! is_string($references) || ! preg_match('/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/', $references)) {
                    throw new InvalidArgumentException(
                        "Column [{$name}] requires references as table.column (e.g. roles.id).",
                    );
                }

                if (isset($column['on_delete']) && ! in_array($column['on_delete'], ColumnTypes::ON_DELETE_ACTIONS, true)) {
                    throw new InvalidArgumentException(
                        "Column [{$name}] has invalid on_delete [{$column['on_delete']}].",
                    );
                }
            }

            if (in_array($type, ['enum', 'set'], true)) {
                $values = $column['values'] ?? null;

                if (! is_array($values) || $values === []) {
                    throw new InvalidArgumentException("Column [{$name}] of type [{$type}] requires a non-empty values list.");
                }
            }
        }

        if (isset($shape['primary'])) {
            foreach ($shape['primary'] as $primaryColumn) {
                if (! isset($names[$primaryColumn])) {
                    throw new InvalidArgumentException(
                        "Primary key references unknown column [{$primaryColumn}].",
                    );
                }
            }
        }
    }

    /**
     * A column's stable identity across renames, independent of its current `name`.
     *
     * Falls back to the current name when no explicit id was submitted, so shapes
     * saved before this field existed keep matching by name exactly as before —
     * a real id is only needed once a column is renamed, and the UI freezes one
     * onto the column at that point.
     *
     * @param  array<string, mixed>  $column
     */
    private function resolveColumnId(array $column, string $name): string
    {
        $id = $column['column_id'] ?? null;

        return is_string($id) && $id !== '' ? $id : $name;
    }

    /**
     * @param  array<string, mixed>  $column
     * @return array<string, mixed>
     */
    private function applyColumnKeyAliases(array $column): array
    {
        foreach (self::COLUMN_KEY_ALIASES as $alias => $canonical) {
            if (array_key_exists($alias, $column) && ! array_key_exists($canonical, $column)) {
                $column[$canonical] = $column[$alias];
            }

            unset($column[$alias]);
        }

        return $column;
    }

    private function normalizeOnDelete(string $action): string
    {
        $action = strtolower(trim($action));

        $aliases = [
            'setnull' => 'set_null',
            'set null' => 'set_null',
            'noaction' => 'no_action',
            'no action' => 'no_action',
            'cascade' => 'cascade',
            'restrict' => 'restrict',
            'set_null' => 'set_null',
            'no_action' => 'no_action',
        ];

        return $aliases[$action] ?? $action;
    }

    /**
     * Keep unknown / incomplete columns mostly intact so drafts are not destructive.
     *
     * @param  array<string, mixed>  $column
     * @param  array{name: string, type: string}  $base
     * @return array<string, mixed>
     */
    private function preserveUnknownColumn(array $column, array $base): array
    {
        unset($column['name'], $column['type']);

        return array_merge($base, $column);
    }

    private function isSnakeCaseIdentifier(string $value): bool
    {
        return (bool) preg_match('/^[a-z][a-z0-9_]*$/', $value);
    }
}
