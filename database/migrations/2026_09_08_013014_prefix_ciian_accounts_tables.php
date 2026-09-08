<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Physical renames applied by this migration, old name => new name.
     *
     * Every table Ciian owns carries the `ciian_` prefix. The four Accounts
     * tables were the last ones still sitting on Laravel's bare names, which
     * also reserved `users` / `roles` / `permissions` against the systems built
     * inside Ciian — slugs are unique across both table stores, so the platform
     * occupying a name put it permanently out of reach.
     *
     * @var array<string, string>
     */
    private const RENAMES = [
        'users' => 'ciian_users',
        'roles' => 'ciian_roles',
        'permissions' => 'ciian_permissions',
        'permission_role' => 'ciian_permission_role',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->applyRenames(self::RENAMES);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->applyRenames(array_flip(self::RENAMES));
    }

    /**
     * Rename the physical tables, then carry the `ciian_int_tbl` metadata with
     * them. Both halves move together on purpose: a stored shape that outlives
     * the table it describes corrupts every later diff the Database Engine runs.
     *
     * @param  array<string, string>  $map
     */
    private function applyRenames(array $map): void
    {
        foreach ($map as $from => $to) {
            if (Schema::hasTable($from) && ! Schema::hasTable($to)) {
                Schema::rename($from, $to);
            }
        }

        $this->resyncShapes($map);
    }

    /**
     * @param  array<string, string>  $map
     */
    private function resyncShapes(array $map): void
    {
        if (! Schema::hasTable('ciian_int_tbl')) {
            return;
        }

        foreach ($map as $from => $to) {
            $row = DB::table('ciian_int_tbl')->where('slug', $from)->first();

            if ($row === null) {
                continue;
            }

            DB::table('ciian_int_tbl')
                ->where('id', $row->id)
                ->update([
                    'slug' => $to,
                    'unpub_shape' => $this->reshape($row->unpub_shape ?? null, $map),
                    'pub_shape' => $this->reshape($row->pub_shape ?? null, $map),
                ]);
        }
    }

    /**
     * Rewrite a stored shape's physical table name and its `table.column`
     * foreign key references onto the new names.
     *
     * @param  array<string, string>  $map
     */
    private function reshape(mixed $json, array $map): ?string
    {
        if (! is_string($json) || $json === '') {
            return null;
        }

        $shape = json_decode($json, true);

        if (! is_array($shape)) {
            return $json;
        }

        $physical = $shape['tbl_db_name'] ?? null;

        if (is_string($physical) && isset($map[$physical])) {
            $shape['tbl_db_name'] = $map[$physical];
        }

        $columns = $shape['columns'] ?? [];

        if (is_array($columns)) {
            foreach ($columns as $index => $column) {
                if (! is_array($column)) {
                    continue;
                }

                $reference = $column['references'] ?? null;

                if (! is_string($reference) || ! str_contains($reference, '.')) {
                    continue;
                }

                [$table, $columnName] = explode('.', $reference, 2);

                if (isset($map[$table])) {
                    $columns[$index]['references'] = $map[$table].'.'.$columnName;
                }
            }

            $shape['columns'] = $columns;
        }

        $encoded = json_encode($shape);

        // Leave the row untouched rather than blanking a shape we failed to
        // re-encode: a missing shape is worse than an unrenamed one.
        return $encoded === false ? $json : $encoded;
    }
};
