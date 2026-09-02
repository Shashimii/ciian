<?php

namespace App\Support;

/**
 * Allowed database column types for table shapes and the options each type supports.
 *
 * @see .ai/shapes/db_table_format.md
 */
class ColumnTypes
{
    /**
     * Column type definitions keyed by Blueprint-style type name.
     *
     * Each entry has a UI `label` and an `options` list of shape keys that type may use.
     * `unique` and `indexed` are allowed on any column by the Tables UI and are not listed here.
     *
     * @var array<string, array{label: string, options: list<string>}>
     */
    public const DEFINITIONS = [
        // Numeric
        'id' => ['label' => 'ID', 'options' => ['nullable', 'auto_increment']],
        'increments' => ['label' => 'Increments', 'options' => ['nullable', 'auto_increment']],
        'tinyIncrements' => ['label' => 'Tiny Increments', 'options' => ['nullable', 'auto_increment']],
        'smallIncrements' => ['label' => 'Small Increments', 'options' => ['nullable', 'auto_increment']],
        'mediumIncrements' => ['label' => 'Medium Increments', 'options' => ['nullable', 'auto_increment']],
        'bigIncrements' => ['label' => 'Big Increments', 'options' => ['nullable', 'auto_increment']],
        'integer' => ['label' => 'Integer', 'options' => ['nullable', 'default', 'unsigned', 'auto_increment']],
        'tinyInteger' => ['label' => 'Tiny Integer', 'options' => ['nullable', 'default', 'unsigned', 'auto_increment']],
        'smallInteger' => ['label' => 'Small Integer', 'options' => ['nullable', 'default', 'unsigned', 'auto_increment']],
        'mediumInteger' => ['label' => 'Medium Integer', 'options' => ['nullable', 'default', 'unsigned', 'auto_increment']],
        'bigInteger' => ['label' => 'Big Integer', 'options' => ['nullable', 'default', 'unsigned', 'auto_increment']],
        'unsignedInteger' => ['label' => 'Unsigned Integer', 'options' => ['nullable', 'default', 'auto_increment']],
        'unsignedTinyInteger' => ['label' => 'Unsigned Tiny Integer', 'options' => ['nullable', 'default', 'auto_increment']],
        'unsignedSmallInteger' => ['label' => 'Unsigned Small Integer', 'options' => ['nullable', 'default', 'auto_increment']],
        'unsignedMediumInteger' => ['label' => 'Unsigned Medium Integer', 'options' => ['nullable', 'default', 'auto_increment']],
        'unsignedBigInteger' => ['label' => 'Unsigned Big Integer', 'options' => ['nullable', 'default', 'auto_increment']],
        'decimal' => ['label' => 'Decimal', 'options' => ['nullable', 'default', 'precision', 'scale', 'unsigned']],
        'float' => ['label' => 'Float', 'options' => ['nullable', 'default', 'precision', 'scale', 'unsigned']],
        'double' => ['label' => 'Double', 'options' => ['nullable', 'default', 'precision', 'scale', 'unsigned']],

        // Text
        'string' => ['label' => 'String', 'options' => ['nullable', 'default', 'length']],
        'char' => ['label' => 'Char', 'options' => ['nullable', 'default', 'length']],
        'text' => ['label' => 'Text', 'options' => ['nullable']],
        'tinyText' => ['label' => 'Tiny Text', 'options' => ['nullable']],
        'mediumText' => ['label' => 'Medium Text', 'options' => ['nullable']],
        'longText' => ['label' => 'Long Text', 'options' => ['nullable']],

        // Boolean
        'boolean' => ['label' => 'Boolean', 'options' => ['nullable', 'default']],

        // Date & time
        'date' => ['label' => 'Date', 'options' => ['nullable', 'default']],
        'dateTime' => ['label' => 'DateTime', 'options' => ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update']],
        'dateTimeTz' => ['label' => 'DateTime (TZ)', 'options' => ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update']],
        'time' => ['label' => 'Time', 'options' => ['nullable', 'default', 'precision']],
        'timeTz' => ['label' => 'Time (TZ)', 'options' => ['nullable', 'default', 'precision']],
        'timestamp' => ['label' => 'Timestamp', 'options' => ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update']],
        'timestampTz' => ['label' => 'Timestamp (TZ)', 'options' => ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update']],
        'year' => ['label' => 'Year', 'options' => ['nullable', 'default']],

        // Binary & JSON
        'binary' => ['label' => 'Binary', 'options' => ['nullable']],
        'json' => ['label' => 'JSON', 'options' => ['nullable', 'default']],
        'jsonb' => ['label' => 'JSONB', 'options' => ['nullable', 'default']],

        // UUID & ULID
        'uuid' => ['label' => 'UUID', 'options' => ['nullable', 'default']],
        'ulid' => ['label' => 'ULID', 'options' => ['nullable', 'default']],

        // Relationships
        'foreignId' => ['label' => 'Foreign ID', 'options' => ['nullable', 'references', 'on_delete']],
        'foreignUlid' => ['label' => 'Foreign ULID', 'options' => ['nullable', 'references', 'on_delete']],
        'foreignUuid' => ['label' => 'Foreign UUID', 'options' => ['nullable', 'references', 'on_delete']],

        // Specialty
        'enum' => ['label' => 'Enum', 'options' => ['nullable', 'default', 'values']],
        'set' => ['label' => 'Set', 'options' => ['nullable', 'default', 'values']],
        'ipAddress' => ['label' => 'IP Address', 'options' => ['nullable', 'default']],
        'macAddress' => ['label' => 'MAC Address', 'options' => ['nullable', 'default']],
        'rememberToken' => ['label' => 'Remember Token', 'options' => ['nullable']],
        'vector' => ['label' => 'Vector', 'options' => ['nullable', 'dimensions']],
        'softDeletes' => ['label' => 'Soft Deletes', 'options' => ['precision']],
        'softDeletesTz' => ['label' => 'Soft Deletes (TZ)', 'options' => ['precision']],

        // Spatial
        'geometry' => ['label' => 'Geometry', 'options' => ['nullable']],
        'geography' => ['label' => 'Geography', 'options' => ['nullable']],
    ];

    /**
     * Options the Tables UI may set on any column, regardless of type.
     *
     * @var list<string>
     */
    public const UNIVERSAL_OPTIONS = [
        'unique',
        'indexed',
    ];

    /**
     * Allowed foreign-key on-delete actions (snake_case).
     *
     * @var list<string>
     */
    public const ON_DELETE_ACTIONS = [
        'cascade',
        'restrict',
        'set_null',
        'no_action',
    ];

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return array_keys(self::DEFINITIONS);
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return array_map(
            static fn (array $definition): string => $definition['label'],
            self::DEFINITIONS,
        );
    }

    /**
     * @return array{label: string, options: list<string>}|null
     */
    public static function definition(string $type): ?array
    {
        return self::DEFINITIONS[$type] ?? null;
    }

    public static function isValid(string $type): bool
    {
        return isset(self::DEFINITIONS[$type]);
    }

    /**
     * @return list<string>
     */
    public static function options(string $type): array
    {
        return self::DEFINITIONS[$type]['options'] ?? [];
    }

    public static function supports(string $type, string $option): bool
    {
        if (in_array($option, self::UNIVERSAL_OPTIONS, true)) {
            return true;
        }

        return in_array($option, self::options($type), true);
    }

    public static function isForeignKey(string $type): bool
    {
        return in_array($type, ['foreignId', 'foreignUlid', 'foreignUuid'], true);
    }

    public static function isIncrementingKey(string $type): bool
    {
        return in_array($type, [
            'id',
            'increments',
            'tinyIncrements',
            'smallIncrements',
            'mediumIncrements',
            'bigIncrements',
        ], true);
    }
}
