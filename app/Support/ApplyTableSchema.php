<?php

namespace App\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;
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
            ->filter(fn (string $name): bool => $fromColumns[$name] !== $toColumns[$name]);

        Schema::table($tableName, function (Blueprint $table) use ($fromColumns, $dropped, $changed): void {
            foreach ($dropped->merge($changed) as $name) {
                $previous = $fromColumns[$name] ?? null;

                if (is_array($previous) && ColumnTypes::isForeignKey($previous['type'] ?? '')) {
                    $table->dropForeign([$name]);
                }
            }

            foreach ($dropped as $name) {
                $table->dropColumn($name);
            }

            foreach ($changed as $name) {
                $table->dropColumn($name);
            }
        });

        Schema::table($tableName, function (Blueprint $table) use ($toColumns, $added, $changed): void {
            foreach ($added->merge($changed) as $name) {
                $this->addColumn($table, $toColumns[$name]);
            }
        });

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
     * @param  array<string, mixed>  $column
     */
    private function addColumn(Blueprint $table, array $column): void
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

        if (($column['unique'] ?? false)) {
            $definition->unique();
        } elseif (($column['indexed'] ?? false)) {
            $definition->index();
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

        $definition->constrained($matches[1], $matches[2]);

        match ($column['on_delete'] ?? 'restrict') {
            'cascade' => $definition->cascadeOnDelete(),
            'set_null' => $definition->nullOnDelete(),
            'no_action' => $definition->noActionOnDelete(),
            default => $definition->restrictOnDelete(),
        };
    }
}
