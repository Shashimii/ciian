<?php

namespace App\Actions\Database;

use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\ColumnTypes;
use App\Support\EloquentModelPath;
use Illuminate\Support\Facades\File;

class GenerateEloquentModel
{
    public function __construct(private EloquentModelPath $paths) {}

    /**
     * Generate or merge the Eloquent model for a published shape, and sync inbound hasMany on generated parents.
     *
     * @param  array<string, mixed>  $shape
     */
    public function handle(InternalTable|SystemTable $table, array $shape): void
    {
        $target = $this->paths->forShape($table, $shape);

        if ($target['skip'] || $target['path'] === null || $target['class'] === null) {
            return;
        }

        if ($target['protected']) {
            $this->mergeProtectedModel($target, $shape);
        } else {
            $this->writeGeneratedModel($target, $shape);
        }

        $this->syncParentHasManyRelations($shape, $target);
    }

    /**
     * Remove inbound hasMany relations this table's foreign keys added to parent
     * models. Called before the table's own row is deleted, so a deleted child no
     * longer leaves a dangling relation pointing at a class that stops existing.
     *
     * @param  array<string, mixed>  $shape
     */
    public function handleDeletion(InternalTable|SystemTable $table, array $shape): void
    {
        $target = $this->paths->forShape($table, $shape);

        if ($target['skip'] || $target['class'] === null || $target['short'] === null) {
            return;
        }

        $this->removeParentHasManyRelations($shape, $target);
    }

    /**
     * @param  array{
     *     skip: bool,
     *     protected: bool,
     *     class: class-string|null,
     *     namespace: string|null,
     *     short: string|null,
     *     path: string|null,
     *     table: string,
     * }  $target
     * @param  array<string, mixed>  $shape
     */
    private function writeGeneratedModel(array $target, array $shape): void
    {
        $directory = dirname((string) $target['path']);

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        File::put((string) $target['path'], $this->renderGeneratedModel($target, $shape));
    }

    /**
     * @param  array{
     *     class: class-string|null,
     *     namespace: string|null,
     *     short: string|null,
     *     path: string|null,
     *     table: string,
     * }  $target
     * @param  array<string, mixed>  $shape
     */
    private function renderGeneratedModel(array $target, array $shape): string
    {
        $columns = $this->columns($shape);
        $fillable = $this->fillableColumns($columns);
        $properties = $this->propertyLines($columns, (bool) ($shape['timestamps'] ?? true));
        $relations = $this->belongsToRelations($columns);
        $imports = $this->collectImports($relations, $shape, $columns);
        $casts = $this->castEntries($columns);
        $usesSoftDeletes = $this->hasSoftDeletes($columns);
        $timestamps = (bool) ($shape['timestamps'] ?? true);

        if ($usesSoftDeletes) {
            $imports[] = 'Illuminate\\Database\\Eloquent\\SoftDeletes';
        }

        $imports = array_values(array_unique($imports));
        sort($imports);

        $importBlock = $imports === []
            ? ''
            : implode("\n", array_map(fn (string $import): string => "use {$import};", $imports))."\n";

        $fillableExport = $this->exportStringList($fillable);
        $propertyBlock = $properties === []
            ? ''
            : implode("\n", $properties)."\n";

        $relationPropertyLines = [];
        foreach ($relations as $relation) {
            $relationPropertyLines[] = " * @property-read \\{$relation['related']}|null \${$relation['method']}";
        }

        $relationPropertyBlock = $relationPropertyLines === []
            ? ''
            : implode("\n", $relationPropertyLines)."\n";

        $body = [];
        $body[] = "#[Fillable({$fillableExport})]";
        $body[] = "class {$target['short']} extends Model";
        $body[] = '{';

        if ($usesSoftDeletes) {
            $body[] = '    use SoftDeletes;';
            $body[] = '';
        }

        $body[] = '    /**';
        $body[] = '     * @var string';
        $body[] = '     */';
        $body[] = "    protected \$table = '{$target['table']}';";
        $body[] = '';

        if (! $timestamps) {
            $body[] = '    /**';
            $body[] = '     * @var bool';
            $body[] = '     */';
            $body[] = '    public $timestamps = false;';
            $body[] = '';
        }

        if ($casts !== []) {
            $body[] = '    /**';
            $body[] = '     * @return array<string, string>';
            $body[] = '     */';
            $body[] = '    protected function casts(): array';
            $body[] = '    {';
            $body[] = '        return [';
            foreach ($casts as $attribute => $cast) {
                $body[] = "            '{$attribute}' => '{$cast}',";
            }
            $body[] = '        ];';
            $body[] = '    }';
            $body[] = '';
        }

        foreach ($relations as $index => $relation) {
            if ($index > 0) {
                $body[] = '';
            }

            $related = $relation['related'];
            $method = $relation['method'];
            $foreignKey = $relation['foreign_key'];

            $body[] = '    /**';
            $body[] = "     * @return BelongsTo<\\{$related}, \$this>";
            $body[] = '     */';
            $body[] = "    public function {$method}(): BelongsTo";
            $body[] = '    {';
            $body[] = "        return \$this->belongsTo(\\{$related}::class, '{$foreignKey}');";
            $body[] = '    }';
        }

        // Trim trailing blank line inside class
        while ($body !== [] && end($body) === '') {
            array_pop($body);
        }

        $body[] = '}';
        $body[] = '';

        return "<?php\n\n"
            ."namespace {$target['namespace']};\n\n"
            .$importBlock
            ."\n"
            ."/**\n"
            ." * Generated by Ciian Database Engine. Safe to regenerate on publish/sync.\n"
            ." *\n"
            .$propertyBlock
            .$relationPropertyBlock
            ." */\n"
            .implode("\n", $body);
    }

    /**
     * Merge Fillable, @property docs, and missing belongsTo methods into hand-written models.
     * Never overwrites #[Hidden] or custom methods.
     *
     * @param  array{
     *     class: class-string|null,
     *     path: string|null,
     *     table: string,
     * }  $target
     * @param  array<string, mixed>  $shape
     */
    private function mergeProtectedModel(array $target, array $shape): void
    {
        $path = (string) $target['path'];

        if (! File::exists($path)) {
            return;
        }

        $source = File::get($path);
        $columns = $this->columns($shape);
        $fromShape = $this->fillableColumns($columns);
        $hidden = $this->parseAttributeList($source, 'Hidden');
        $existingFillable = $this->parseAttributeList($source, 'Fillable');

        // Hidden attributes are not added from the shape, but existing Fillable
        // entries (e.g. password) are preserved even when also Hidden.
        $fromShape = array_values(array_filter(
            $fromShape,
            fn (string $column): bool => ! in_array($column, $hidden, true),
        ));

        $fillable = array_values(array_unique([...$existingFillable, ...$fromShape]));

        $source = $this->mergeFillableAttribute($source, $fillable);
        $source = $this->mergeDocProperties($source, $columns, (bool) ($shape['timestamps'] ?? true));
        $source = $this->mergeBelongsToMethods($source, $columns);

        File::put($path, $source);
    }

    /**
     * @param  array<string, mixed>  $shape
     * @param  array{class: class-string|null, short: string|null, table: string}  $childTarget
     */
    private function removeParentHasManyRelations(array $shape, array $childTarget): void
    {
        if ($childTarget['class'] === null || $childTarget['short'] === null) {
            return;
        }

        foreach ($this->columns($shape) as $column) {
            if (! ColumnTypes::isForeignKey((string) ($column['type'] ?? ''))) {
                continue;
            }

            $references = (string) ($column['references'] ?? '');

            if (! preg_match('/^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/', $references, $matches)) {
                continue;
            }

            $parentTarget = $this->paths->forPhysicalTable($matches[1]);

            if (
                $parentTarget === null
                || $parentTarget['skip']
                || $parentTarget['protected']
                || $parentTarget['path'] === null
                || ! File::exists($parentTarget['path'])
            ) {
                continue;
            }

            $method = $this->paths->hasManyMethodName($childTarget['table']);
            $this->removeHasManyMethod($parentTarget['path'], $method);
        }
    }

    private function removeHasManyMethod(string $path, string $method): void
    {
        $source = File::get($path);

        $methodPattern = '/\n    \/\*\*.*?\*\/\n    public function '.preg_quote($method, '/').'\(\): HasMany\n    \{.*?\n    \}/s';

        if (preg_match($methodPattern, $source) !== 1) {
            return;
        }

        $source = preg_replace($methodPattern, '', $source, 1) ?? $source;

        $docPattern = '/\n \* @property-read [^\n]*> \$'.preg_quote($method, '/').'\b/';
        $source = preg_replace($docPattern, '', $source, 1) ?? $source;

        // The class no longer declares any hasMany relation — the import is now unused.
        if (preg_match('/\): HasMany\b/', $source) !== 1) {
            $source = preg_replace(
                '/\nuse Illuminate\\\\Database\\\\Eloquent\\\\Relations\\\\HasMany;/',
                '',
                $source,
                1,
            ) ?? $source;
        }

        // Collapse the blank-line gap the removed method left behind.
        $source = preg_replace("/\n{3,}/", "\n\n", $source) ?? $source;

        File::put($path, $source);
    }

    /**
     * @param  array<string, mixed>  $shape
     * @param  array{
     *     class: class-string|null,
     *     short: string|null,
     *     table: string,
     * }  $childTarget
     */
    private function syncParentHasManyRelations(array $shape, array $childTarget): void
    {
        if ($childTarget['class'] === null || $childTarget['short'] === null) {
            return;
        }

        foreach ($this->columns($shape) as $column) {
            if (! ColumnTypes::isForeignKey((string) ($column['type'] ?? ''))) {
                continue;
            }

            $references = (string) ($column['references'] ?? '');

            if (! preg_match('/^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/', $references, $matches)) {
                continue;
            }

            $parentTarget = $this->paths->forPhysicalTable($matches[1]);

            if (
                $parentTarget === null
                || $parentTarget['skip']
                || $parentTarget['protected']
                || $parentTarget['path'] === null
                || $parentTarget['class'] === null
                || ! File::exists($parentTarget['path'])
            ) {
                continue;
            }

            $method = $this->paths->hasManyMethodName($childTarget['table']);
            $foreignKey = (string) $column['name'];
            $this->upsertHasManyMethod(
                path: $parentTarget['path'],
                method: $method,
                relatedClass: $childTarget['class'],
                foreignKey: $foreignKey,
            );
        }
    }

    /**
     * @param  class-string  $relatedClass
     */
    private function upsertHasManyMethod(string $path, string $method, string $relatedClass, string $foreignKey): void
    {
        $source = File::get($path);

        $methodBody = implode("\n", [
            '    /**',
            "     * @return HasMany<\\{$relatedClass}, \$this>",
            '     */',
            "    public function {$method}(): HasMany",
            '    {',
            "        return \$this->hasMany(\\{$relatedClass}::class, '{$foreignKey}');",
            '    }',
        ]);

        if (! str_contains($source, 'use Illuminate\\Database\\Eloquent\\Relations\\HasMany;')) {
            $source = preg_replace(
                '/(use Illuminate\\\\Database\\\\Eloquent\\\\Model;)/',
                "$1\nuse Illuminate\\Database\\Eloquent\\Relations\\HasMany;",
                $source,
                1,
            ) ?? $source;
        }

        $pattern = '/\n    \/\*\*.*?\*\/\n    public function '.preg_quote($method, '/').'\(\): HasMany\n    \{.*?\n    \}/s';

        if (preg_match($pattern, $source) === 1) {
            $source = preg_replace($pattern, "\n".$methodBody, $source, 1) ?? $source;
        } else {
            $source = preg_replace('/\n\}\s*$/', "\n\n".$methodBody."\n}\n", $source, 1) ?? $source;
        }

        $docLine = " * @property-read \\Illuminate\\Database\\Eloquent\\Collection<int, \\{$relatedClass}> \${$method}";
        if (! str_contains($source, '$'.$method) && preg_match('/\/\*\*(.*?)\*\//s', $source, $docMatch) === 1) {
            $updatedDoc = rtrim($docMatch[1])."\n{$docLine}\n ";
            $source = preg_replace('/\/\*\*.*?\*\//s', '/**'.$updatedDoc.'*/', $source, 1) ?? $source;
        }

        File::put($path, $source);
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return list<string>
     */
    private function fillableColumns(array $columns): array
    {
        $fillable = [];

        foreach ($columns as $column) {
            $name = (string) ($column['name'] ?? '');
            $type = (string) ($column['type'] ?? '');

            if ($name === '' || $this->isNonFillableColumn($name, $type, $column)) {
                continue;
            }

            $fillable[] = $name;
        }

        return array_values(array_unique($fillable));
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function isNonFillableColumn(string $name, string $type, array $column): bool
    {
        if (in_array($name, ['id', 'created_at', 'updated_at'], true)) {
            return true;
        }

        if (in_array($type, ['id', 'increments', 'tinyIncrements', 'smallIncrements', 'mediumIncrements', 'bigIncrements', 'rememberToken', 'softDeletes', 'softDeletesTz', 'timestamp', 'timestampTz', 'dateTime', 'dateTimeTz', 'date', 'time', 'timeTz'], true)) {
            return true;
        }

        if ($column['auto_increment'] ?? false) {
            return true;
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return list<string>
     */
    private function propertyLines(array $columns, bool $timestamps): array
    {
        $lines = [];

        foreach ($columns as $column) {
            $name = (string) ($column['name'] ?? '');
            $type = (string) ($column['type'] ?? '');

            if ($name === '' || in_array($type, ['rememberToken', 'softDeletes', 'softDeletesTz'], true)) {
                continue;
            }

            $phpType = $this->phpTypeForColumn($column);
            $lines[] = " * @property {$phpType} \${$name}";
        }

        if ($timestamps) {
            $lines[] = ' * @property \\Illuminate\\Support\\Carbon|null $created_at';
            $lines[] = ' * @property \\Illuminate\\Support\\Carbon|null $updated_at';
        }

        if ($this->hasSoftDeletes($columns)) {
            $lines[] = ' * @property \\Illuminate\\Support\\Carbon|null $deleted_at';
        }

        return $lines;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function phpTypeForColumn(array $column): string
    {
        $type = (string) ($column['type'] ?? 'string');
        $nullable = (bool) ($column['nullable'] ?? false);

        $base = match (true) {
            in_array($type, ['id', 'increments', 'tinyIncrements', 'smallIncrements', 'mediumIncrements', 'bigIncrements', 'integer', 'tinyInteger', 'smallInteger', 'mediumInteger', 'bigInteger', 'unsignedInteger', 'unsignedTinyInteger', 'unsignedSmallInteger', 'unsignedMediumInteger', 'unsignedBigInteger', 'foreignId', 'year'], true) => 'int',
            in_array($type, ['boolean'], true) => 'bool',
            in_array($type, ['decimal', 'float', 'double'], true) => 'string',
            in_array($type, ['json', 'jsonb'], true) => 'array',
            in_array($type, ['date', 'dateTime', 'dateTimeTz', 'timestamp', 'timestampTz', 'time', 'timeTz'], true) => '\\Illuminate\\Support\\Carbon',
            default => 'string',
        };

        if ($nullable && ! str_contains($base, '|null')) {
            return $base.'|null';
        }

        return $base;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return list<array{method: string, foreign_key: string, related: class-string, related_table: string}>
     */
    private function belongsToRelations(array $columns): array
    {
        $relations = [];

        foreach ($columns as $column) {
            $type = (string) ($column['type'] ?? '');
            $name = (string) ($column['name'] ?? '');

            if ($name === '' || ! ColumnTypes::isForeignKey($type)) {
                continue;
            }

            $references = (string) ($column['references'] ?? '');

            if (! preg_match('/^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/', $references, $matches)) {
                continue;
            }

            $relatedTarget = $this->paths->forPhysicalTable($matches[1]);

            if ($relatedTarget === null || $relatedTarget['class'] === null) {
                // Fall back to convention under Ciian when the related model is not registered yet.
                $short = $this->paths->classNameFromTable($matches[1]);
                $relatedClass = 'App\\Models\\Systems\\Ciian\\'.$short;
            } else {
                $relatedClass = $relatedTarget['class'];
            }

            $relations[] = [
                'method' => $this->paths->belongsToMethodName($name),
                'foreign_key' => $name,
                'related' => $relatedClass,
                'related_table' => $matches[1],
            ];
        }

        return $relations;
    }

    /**
     * @param  list<array{method: string, foreign_key: string, related: class-string, related_table: string}>  $relations
     * @param  array<string, mixed>  $shape
     * @param  list<array<string, mixed>>  $columns
     * @return list<string>
     */
    private function collectImports(array $relations, array $shape, array $columns): array
    {
        $imports = [
            'Illuminate\\Database\\Eloquent\\Attributes\\Fillable',
            'Illuminate\\Database\\Eloquent\\Model',
        ];

        if ($relations !== []) {
            $imports[] = 'Illuminate\\Database\\Eloquent\\Relations\\BelongsTo';
        }

        foreach ($relations as $relation) {
            $imports[] = $relation['related'];
        }

        if ($this->castEntries($columns) !== [] || $this->propertyLines($columns, (bool) ($shape['timestamps'] ?? true)) !== []) {
            // Carbon referenced via FQCN in docblock; no import required.
        }

        return $imports;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return array<string, string>
     */
    private function castEntries(array $columns): array
    {
        $casts = [];

        foreach ($columns as $column) {
            $name = (string) ($column['name'] ?? '');
            $type = (string) ($column['type'] ?? '');

            if ($name === '') {
                continue;
            }

            $cast = match ($type) {
                'boolean' => 'boolean',
                'json', 'jsonb' => 'array',
                'date' => 'date',
                'dateTime', 'dateTimeTz', 'timestamp', 'timestampTz' => 'datetime',
                default => null,
            };

            if ($cast !== null) {
                $casts[$name] = $cast;
            }
        }

        if ($this->hasSoftDeletes($columns)) {
            $casts['deleted_at'] = 'datetime';
        }

        return $casts;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     */
    private function hasSoftDeletes(array $columns): bool
    {
        foreach ($columns as $column) {
            if (in_array($column['type'] ?? '', ['softDeletes', 'softDeletesTz'], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $shape
     * @return list<array<string, mixed>>
     */
    private function columns(array $shape): array
    {
        $columns = $shape['columns'] ?? [];

        return is_array($columns) ? array_values(array_filter($columns, 'is_array')) : [];
    }

    /**
     * @param  list<string>  $values
     */
    private function exportStringList(array $values): string
    {
        if ($values === []) {
            return '[]';
        }

        $quoted = array_map(fn (string $value): string => "'{$value}'", $values);

        return '['.implode(', ', $quoted).']';
    }

    /**
     * @return list<string>
     */
    private function parseAttributeList(string $source, string $attribute): array
    {
        if (preg_match('/#\['.preg_quote($attribute, '/').'\(\[(.*?)\]\)\]/s', $source, $match) !== 1) {
            return [];
        }

        preg_match_all("/'([^']+)'/", $match[1], $attrs);

        return $attrs[1] ?? [];
    }

    /**
     * @param  list<string>  $fillable
     */
    private function mergeFillableAttribute(string $source, array $fillable): string
    {
        $export = $this->exportStringList($fillable);

        if (preg_match('/#\[Fillable\(\[.*?\]\)\]/s', $source) === 1) {
            return preg_replace(
                '/#\[Fillable\(\[.*?\]\)\]/s',
                "#[Fillable({$export})]",
                $source,
                1,
            ) ?? $source;
        }

        return preg_replace(
            '/\n(class\s+\w+)/',
            "\n#[Fillable({$export})]\n$1",
            $source,
            1,
        ) ?? $source;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     */
    private function mergeDocProperties(string $source, array $columns, bool $timestamps): string
    {
        if (preg_match('/\/\*\*(.*?)\*\//s', $source, $match) !== 1) {
            return $source;
        }

        $doc = $match[1];
        $desired = $this->propertyLines($columns, $timestamps);

        foreach ($desired as $line) {
            if (! preg_match('/@property(?:-read)?\s+\S+\s+(\$\w+)/', $line, $propMatch)) {
                continue;
            }

            $var = $propMatch[1];

            // Keep existing doc lines for this property (hand-written Carbon imports, etc.).
            if (preg_match('/ \* @property(?:-read)?\s+\S+\s+'.preg_quote($var, '/').'\b/', $doc) === 1) {
                continue;
            }

            $doc = rtrim($doc)."\n{$line}\n ";
        }

        return preg_replace('/\/\*\*.*?\*\//s', '/**'.$doc.'*/', $source, 1) ?? $source;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     */
    private function mergeBelongsToMethods(string $source, array $columns): string
    {
        $relations = $this->belongsToRelations($columns);

        if ($relations === []) {
            return $source;
        }

        if (! str_contains($source, 'use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;')) {
            $source = preg_replace(
                '/(namespace [^;]+;\n\n)/',
                "$1use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;\n",
                $source,
                1,
            ) ?? $source;
        }

        foreach ($relations as $relation) {
            if (preg_match('/function\s+'.preg_quote($relation['method'], '/').'\s*\(/', $source) === 1) {
                continue;
            }

            $related = $relation['related'];
            $method = implode("\n", [
                '',
                '    /**',
                "     * @return BelongsTo\\<\\{$related}, \$this>",
                '     */',
                "    public function {$relation['method']}(): BelongsTo",
                '    {',
                "        return \$this->belongsTo(\\{$related}::class, '{$relation['foreign_key']}');",
                '    }',
            ]);

            $source = preg_replace('/\n\}\s*$/', $method."\n}\n", $source, 1) ?? $source;
        }

        return $source;
    }
}
