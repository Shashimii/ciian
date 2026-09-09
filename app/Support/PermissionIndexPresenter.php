<?php

namespace App\Support;

use App\Models\Ciian\Permission;

/**
 * Shapes ciian_permissions rows for the Permissions index.
 *
 * Every row today comes from `SystemDefaultsSeeder` and covers a platform
 * module. Permissions created by a system — scoped to one of its pages — will
 * land in the same table, which is why the index reads rather than edits.
 */
class PermissionIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function permissions(): array
    {
        return array_values(
            Permission::query()
                ->with('system')
                ->withCount('roles')
                ->orderBy('name')
                ->get()
                ->map(fn (Permission $permission): array => $this->present($permission))
                ->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Permission $permission): array
    {
        return [
            'key' => "permission-{$permission->id}",
            'id' => $permission->id,
            'name' => $permission->name,
            'slug' => $permission->slug,
            'description' => $permission->description,
            // How many roles currently grant it, so an unused permission is
            // visible at a glance.
            'role_count' => (int) ($permission->roles_count ?? 0),
            // `User::hasPermission` treats this one as a wildcard over the rest.
            'is_root' => $permission->isRoot(),
            // Null for a platform permission; the owning system otherwise, so
            // the two kinds are told apart without reading the slug.
            'system' => $permission->belongsToSystem() && $permission->system !== null
                ? [
                    'name' => $permission->system->name,
                    'icon' => $permission->system->icon,
                    'color' => $permission->system->color,
                ]
                : null,
        ];
    }
}
