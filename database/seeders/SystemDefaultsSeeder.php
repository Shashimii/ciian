<?php

namespace Database\Seeders;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;
use Illuminate\Database\Seeder;

class SystemDefaultsSeeder extends Seeder
{
    /**
     * Seed platform config, Accounts shapes, permissions, and protected default roles.
     */
    public function run(): void
    {
        $this->seedConfig();
        $this->call(CiianInternalTableSeeder::class);
        $this->call(CiianComponentSeeder::class);
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
                'color' => 'violet',
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
        foreach ($this->defaultRoles() as $role) {
            Role::query()->updateOrCreate(
                ['slug' => $role['slug']],
                $role,
            );
        }

        // Root is the only shipped role that carries permissions.
        Role::query()
            ->where('slug', Role::ROOT)
            ->firstOrFail()
            ->permissions()
            ->sync(Permission::query()->where('slug', Permission::ROOT)->pluck('id'));
    }

    /**
     * The protected roles Ciian ships with. This seeder is their only definition
     * — nothing else in the application creates a role, it only resolves one.
     *
     * @return list<array{name: string, slug: string, description: string, icon: string, can_delete: bool}>
     */
    private function defaultRoles(): array
    {
        return [
            [
                'name' => 'Root',
                'slug' => Role::ROOT,
                'description' => 'Full access to System. Immutable cannot be altered or deleted.',
                'icon' => 'Crown',
                'can_delete' => false,
            ],
            [
                'name' => 'User',
                'slug' => Role::USER,
                'description' => 'Default role with no privileges. Access is limited to the main index page only.',
                'icon' => 'User',
                'can_delete' => false,
            ],
        ];
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
                'description' => 'Create roles and assign permissions (except protected system roles).',
            ],
            [
                'name' => 'Manage Permissions',
                'slug' => 'permissions.manage',
                'description' => 'View the permissions roles can be given. They are defined by the platform and by created systems, not authored by hand.',
            ],
            [
                'name' => 'Manage Tables',
                'slug' => 'tables.manage',
                'description' => 'Create, edit, publish, and delete database table shapes.',
            ],
            [
                'name' => 'Manage Components',
                'slug' => 'components.manage',
                'description' => 'Create, edit, publish, and delete UI building blocks.',
            ],
            [
                'name' => 'Manage Systems',
                'slug' => 'systems.manage',
                'description' => 'Create and configure systems in the System Builder.',
            ],
            [
                'name' => 'Manage Settings',
                'slug' => 'settings.manage',
                'description' => 'Change platform settings and entry-point configuration.',
            ],
        ];
    }
}
