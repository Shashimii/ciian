<?php

namespace Database\Seeders;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;
use Illuminate\Database\Seeder;

class SystemDefaultsSeeder extends Seeder
{
    /**
     * Seed platform config, Accounts shapes, permissions, and locked default roles.
     */
    public function run(): void
    {
        $this->seedConfig();
        $this->call(CiianInternalTableSeeder::class);
        $this->seedPermissions();
        $this->seedRoles();
    }

    private function seedConfig(): void
    {
        CiianConfig::query()->updateOrCreate(
            ['sys_slug' => 'ciian'],
            [
                'name' => 'Ciian',
                'icon' => 'Sparkles',
            ],
        );
    }

    private function seedPermissions(): void
    {
        foreach ($this->defaultPermissions() as $permission) {
            Permission::query()->updateOrCreate(
                ['slug' => $permission['slug']],
                $permission,
            );
        }
    }

    private function seedRoles(): void
    {
        $root = Role::query()->updateOrCreate(
            ['slug' => Role::ROOT],
            [
                'name' => 'Root',
                'description' => 'Full access to System. Immutable cannot be altered or deleted.',
                'icon' => 'Crown',
                'locked' => true,
            ],
        );

        $root->permissions()->sync(
            Permission::query()->where('slug', Permission::ROOT)->pluck('id'),
        );

        Role::query()->updateOrCreate(
            ['slug' => Role::USER],
            [
                'name' => 'User',
                'description' => 'Default role with no privileges. Access is limited to the main index page only.',
                'icon' => 'User',
                'locked' => true,
            ],
        );
    }

    /**
     * @return list<array{name: string, slug: string, description: string}>
     */
    private function defaultPermissions(): array
    {
        return [
            [
                'name' => 'Root',
                'slug' => Permission::ROOT,
                'description' => 'Full root access to the platform. Grants every permission.',
            ],
            [
                'name' => 'Manage Users',
                'slug' => 'users.manage',
                'description' => 'Create, update, and deactivate platform users.',
            ],
            [
                'name' => 'Manage Roles',
                'slug' => 'roles.manage',
                'description' => 'Create roles and assign permissions (except locked system roles).',
            ],
            [
                'name' => 'Manage Tables',
                'slug' => 'tables.manage',
                'description' => 'Create, edit, publish, and delete database table shapes.',
            ],
            [
                'name' => 'Manage Systems',
                'slug' => 'systems.manage',
                'description' => 'Create and configure systems in the System Builder.',
            ],
            [
                'name' => 'Manage Components',
                'slug' => 'components.manage',
                'description' => 'Manage reusable UI building-block components.',
            ],
            [
                'name' => 'Manage Settings',
                'slug' => 'settings.manage',
                'description' => 'Change platform settings and entry-point configuration.',
            ],
        ];
    }
}
