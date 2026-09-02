<?php

namespace Database\Seeders;

use App\Models\Ciian\Database\InternalTable;
use Illuminate\Database\Seeder;

/**
 * Seeds platform Accounts table shapes into ciian_int_tbl.
 *
 * Shapes must mirror the physical migrations:
 * - database/migrations/0001_01_01_000000_create_users_table.php
 * - database/migrations/2025_08_14_170933_add_two_factor_columns_to_users_table.php
 * - database/migrations/2026_08_26_080739_create_roles_table.php
 * - database/migrations/2026_08_26_080740_create_permissions_table.php
 * - database/migrations/2026_08_26_080741_create_permission_role_table.php
 *
 * Foreign keys always use references as `table.column` (e.g. roles.id).
 */
class CiianInternalTableSeeder extends Seeder
{
    /**
     * Seed platform Accounts table shapes into ciian_int_tbl.
     */
    public function run(): void
    {
        foreach ($this->tables() as $table) {
            InternalTable::query()->updateOrCreate(
                ['slug' => $table['slug']],
                $table,
            );
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function tables(): array
    {
        return [
            $this->usersTable(),
            $this->rolesTable(),
            $this->permissionsTable(),
            $this->permissionRoleTable(),
        ];
    }

    /**
     * @see database/migrations/0001_01_01_000000_create_users_table.php
     * @see database/migrations/2025_08_14_170933_add_two_factor_columns_to_users_table.php
     * @see database/migrations/2026_08_26_080739_create_roles_table.php (role_id FK)
     *
     * @return array<string, mixed>
     */
    private function usersTable(): array
    {
        $shape = [
            'tbl_name' => 'Users',
            'tbl_db_name' => 'users',
            'tbl_sys' => InternalTable::TAG_CIIAN,
            'columns' => [
                [
                    'name' => 'id',
                    'type' => 'id',
                    'nullable' => false,
                    'auto_increment' => true,
                ],
                [
                    'name' => 'username',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'email',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'role_id',
                    'type' => 'foreignId',
                    'nullable' => false,
                    'indexed' => true,
                    'references' => 'roles.id',
                    'on_delete' => 'restrict',
                ],
                [
                    'name' => 'email_verified_at',
                    'type' => 'timestamp',
                    'nullable' => true,
                ],
                [
                    'name' => 'password',
                    'type' => 'string',
                    'nullable' => false,
                ],
                [
                    'name' => 'two_factor_secret',
                    'type' => 'text',
                    'nullable' => true,
                ],
                [
                    'name' => 'two_factor_recovery_codes',
                    'type' => 'text',
                    'nullable' => true,
                ],
                [
                    'name' => 'two_factor_confirmed_at',
                    'type' => 'timestamp',
                    'nullable' => true,
                ],
                [
                    'name' => 'remember_token',
                    'type' => 'rememberToken',
                    'nullable' => true,
                ],
            ],
            'timestamps' => true,
        ];

        return $this->publishedAccountTable(
            name: 'Users',
            slug: 'users',
            icon: 'Users',
            shape: $shape,
        );
    }

    /**
     * @see database/migrations/2026_08_26_080739_create_roles_table.php
     *
     * @return array<string, mixed>
     */
    private function rolesTable(): array
    {
        $shape = [
            'tbl_name' => 'Roles',
            'tbl_db_name' => 'roles',
            'tbl_sys' => InternalTable::TAG_CIIAN,
            'columns' => [
                [
                    'name' => 'id',
                    'type' => 'id',
                    'nullable' => false,
                    'auto_increment' => true,
                ],
                [
                    'name' => 'name',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'slug',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'description',
                    'type' => 'text',
                    'nullable' => true,
                ],
                [
                    'name' => 'icon',
                    'type' => 'string',
                    'nullable' => false,
                    'default' => 'Shield',
                ],
                [
                    'name' => 'locked',
                    'type' => 'boolean',
                    'nullable' => false,
                    'default' => false,
                    'indexed' => true,
                ],
            ],
            'timestamps' => true,
        ];

        return $this->publishedAccountTable(
            name: 'Roles',
            slug: 'roles',
            icon: 'Shield',
            shape: $shape,
        );
    }

    /**
     * @see database/migrations/2026_08_26_080740_create_permissions_table.php
     *
     * @return array<string, mixed>
     */
    private function permissionsTable(): array
    {
        $shape = [
            'tbl_name' => 'Permissions',
            'tbl_db_name' => 'permissions',
            'tbl_sys' => InternalTable::TAG_CIIAN,
            'columns' => [
                [
                    'name' => 'id',
                    'type' => 'id',
                    'nullable' => false,
                    'auto_increment' => true,
                ],
                [
                    'name' => 'name',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'slug',
                    'type' => 'string',
                    'nullable' => false,
                    'unique' => true,
                ],
                [
                    'name' => 'description',
                    'type' => 'text',
                    'nullable' => true,
                ],
            ],
            'timestamps' => true,
        ];

        return $this->publishedAccountTable(
            name: 'Permissions',
            slug: 'permissions',
            icon: 'KeyRound',
            shape: $shape,
        );
    }

    /**
     * @see database/migrations/2026_08_26_080741_create_permission_role_table.php
     *
     * @return array<string, mixed>
     */
    private function permissionRoleTable(): array
    {
        $shape = [
            'tbl_name' => 'Permission Role',
            'tbl_db_name' => 'permission_role',
            'tbl_sys' => InternalTable::TAG_CIIAN,
            'columns' => [
                [
                    'name' => 'permission_id',
                    'type' => 'foreignId',
                    'nullable' => false,
                    'references' => 'permissions.id',
                    'on_delete' => 'cascade',
                ],
                [
                    'name' => 'role_id',
                    'type' => 'foreignId',
                    'nullable' => false,
                    'references' => 'roles.id',
                    'on_delete' => 'cascade',
                ],
            ],
            'primary' => ['permission_id', 'role_id'],
            'timestamps' => false,
        ];

        return $this->publishedAccountTable(
            name: 'Permission Role',
            slug: 'permission_role',
            icon: 'Link',
            shape: $shape,
        );
    }

    /**
     * @param  array<string, mixed>  $shape
     * @return array<string, mixed>
     */
    private function publishedAccountTable(string $name, string $slug, string $icon, array $shape): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'tag' => InternalTable::TAG_CIIAN,
            'icon' => $icon,
            'status' => InternalTable::STATUS_PUBLISHED,
            // Every table this seeder creates backs platform auth — never deletable
            // through the Tables UI. Clearing this column is a developer-only, direct
            // database action; nothing in the app itself ever flips it back.
            'can_delete' => false,
            'unpub_shape' => $shape,
            'pub_shape' => $shape,
        ];
    }
}
