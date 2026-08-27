<?php

namespace App\Support;

use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;
use App\Models\Ciian\System\SystemTable;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Resolves Eloquent model namespace, class, and path for published table shapes.
 */
class EloquentModelPath
{
    /**
     * Hand-written platform models that must never be fully overwritten.
     *
     * @var array<string, class-string>
     */
    public const PROTECTED = [
        'users' => User::class,
        'roles' => Role::class,
        'permissions' => Permission::class,
    ];

    /**
     * @param  array<string, mixed>  $shape
     * @return array{
     *     skip: bool,
     *     protected: bool,
     *     class: class-string|null,
     *     namespace: string|null,
     *     short: string|null,
     *     path: string|null,
     *     table: string,
     * }
     */
    public function forShape(InternalTable|SystemTable $table, array $shape): array
    {
        $physical = $this->physicalTableName($shape);

        if ($physical === '' || $this->isPivotWithoutModel($shape)) {
            return $this->skipped($physical);
        }

        if (isset(self::PROTECTED[$physical])) {
            $class = self::PROTECTED[$physical];

            return [
                'skip' => false,
                'protected' => true,
                'class' => $class,
                'namespace' => $this->namespaceOf($class),
                'short' => class_basename($class),
                'path' => $this->pathForClass($class),
                'table' => $physical,
            ];
        }

        $folder = $this->folderFor($table);
        $short = $this->classNameFromTable($physical);
        $namespace = 'App\\Models\\'.str_replace('/', '\\', $folder);
        $class = $namespace.'\\'.$short;

        return [
            'skip' => false,
            'protected' => false,
            'class' => $class,
            'namespace' => $namespace,
            'short' => $short,
            'path' => app_path('Models/'.$folder.'/'.$short.'.php'),
            'table' => $physical,
        ];
    }

    /**
     * Resolve a model target from a physical DB table name (e.g. roles).
     *
     * @return array{
     *     skip: bool,
     *     protected: bool,
     *     class: class-string|null,
     *     namespace: string|null,
     *     short: string|null,
     *     path: string|null,
     *     table: string,
     * }|null
     */
    public function forPhysicalTable(string $physical): ?array
    {
        $physical = Str::lower($physical);

        if ($physical === '') {
            return null;
        }

        if (isset(self::PROTECTED[$physical])) {
            $class = self::PROTECTED[$physical];

            return [
                'skip' => false,
                'protected' => true,
                'class' => $class,
                'namespace' => $this->namespaceOf($class),
                'short' => class_basename($class),
                'path' => $this->pathForClass($class),
                'table' => $physical,
            ];
        }

        $internal = InternalTable::query()
            ->where('slug', $physical)
            ->first();

        if ($internal !== null && is_array($internal->pub_shape ?? $internal->unpub_shape)) {
            return $this->forShape(
                $internal,
                is_array($internal->pub_shape) ? $internal->pub_shape : $internal->unpub_shape,
            );
        }

        $systemTable = SystemTable::query()
            ->with('system')
            ->where('slug', $physical)
            ->first();

        if ($systemTable !== null && is_array($systemTable->pub_shape ?? $systemTable->unpub_shape)) {
            return $this->forShape(
                $systemTable,
                is_array($systemTable->pub_shape) ? $systemTable->pub_shape : $systemTable->unpub_shape,
            );
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $shape
     */
    public function physicalTableName(array $shape): string
    {
        $name = $shape['tbl_db_name'] ?? $shape['physical_table'] ?? '';

        return is_string($name) ? Str::lower($name) : '';
    }

    public function classNameFromTable(string $physical): string
    {
        return Str::studly(Str::singular($physical));
    }

    public function belongsToMethodName(string $column): string
    {
        if (str_ends_with($column, '_id')) {
            return Str::camel(Str::beforeLast($column, '_id'));
        }

        return Str::camel($column);
    }

    public function hasManyMethodName(string $childPhysicalTable): string
    {
        return Str::camel($childPhysicalTable);
    }

    private function folderFor(InternalTable|SystemTable $table): string
    {
        if ($table instanceof SystemTable) {
            $table->loadMissing('system');

            return 'Systems/'.Str::studly($table->system->slug);
        }

        return 'Systems/Ciian';
    }

    /**
     * @param  array<string, mixed>  $shape
     */
    private function isPivotWithoutModel(array $shape): bool
    {
        $primary = $shape['primary'] ?? null;
        $columns = $shape['columns'] ?? [];

        if (! is_array($primary) || count($primary) < 2 || ! is_array($columns)) {
            return false;
        }

        foreach ($columns as $column) {
            if (($column['name'] ?? null) === 'id') {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{
     *     skip: bool,
     *     protected: bool,
     *     class: class-string|null,
     *     namespace: string|null,
     *     short: string|null,
     *     path: string|null,
     *     table: string,
     * }
     */
    private function skipped(string $physical): array
    {
        return [
            'skip' => true,
            'protected' => false,
            'class' => null,
            'namespace' => null,
            'short' => null,
            'path' => null,
            'table' => $physical,
        ];
    }

    /**
     * @param  class-string  $class
     */
    private function namespaceOf(string $class): string
    {
        return Str::beforeLast($class, '\\');
    }

    /**
     * @param  class-string  $class
     */
    private function pathForClass(string $class): string
    {
        $relative = Str::after($class, 'App\\');
        $relative = str_replace('\\', '/', $relative);

        return app_path($relative.'.php');
    }
}
