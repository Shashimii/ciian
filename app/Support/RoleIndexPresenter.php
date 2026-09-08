<?php

namespace App\Support;

use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;

/**
 * Shapes ciian_roles rows for the Roles index.
 */
class RoleIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function roles(): array
    {
        return array_values(
            Role::query()
                ->with('permissions')
                ->withCount('users')
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role): array => $this->present($role))
                ->all(),
        );
    }

    /**
     * Every permission a role can be given, in the order they are offered.
     *
     * @return list<array<string, mixed>>
     */
    public function permissions(): array
    {
        return array_values(
            Permission::query()
                ->orderBy('name')
                ->get()
                ->map(fn (Permission $permission): array => [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'slug' => $permission->slug,
                    'description' => $permission->description,
                    // `User::hasPermission` treats this one as a wildcard, so
                    // the form warns before handing it to another role.
                    'is_root' => $permission->isRoot(),
                ])
                ->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Role $role): array
    {
        $userCount = (int) ($role->users_count ?? 0);
        $block = $this->deleteBlockFor($role);

        return [
            'key' => "role-{$role->id}",
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'icon' => $role->icon,
            'permission_count' => $role->permissions->count(),
            'permission_ids' => array_values($role->permissions->pluck('id')->all()),
            // SystemDefaultsSeeder re-syncs Root's permissions on every run, so
            // editing them here would be undone by the next `db:seed`.
            'permissions_locked' => $role->isRoot(),
            // Its `updateOrCreate` rewrites name, description and icon for every
            // shipped role, so those are seeder-owned on Root and User alike.
            'details_locked' => ! $role->canDelete(),
            'user_count' => $userCount,
            // The slug is the role's identity in code — Role::ROOT and
            // Role::USER are matched on it — so it locks once the row exists.
            'is_root' => $role->isRoot(),
            'can_delete' => $block === null,
            'delete_block' => $block,
        ];
    }

    /**
     * Why this role cannot be deleted, or null when it can.
     *
     * The string is the tooltip on the row's disabled lock, so it has to read
     * as a reason on its own. `App\Actions\Role\DeleteRole` refuses the same
     * case server-side.
     *
     * A role accounts still hold is deliberately *not* blocked: the delete
     * dialog asks where to move them, so it is a step rather than a dead end.
     */
    private function deleteBlockFor(Role $role): ?string
    {
        if (! $role->canDelete()) {
            return __('Protected Role');
        }

        return null;
    }
}
