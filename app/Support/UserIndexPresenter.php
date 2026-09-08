<?php

namespace App\Support;

use App\Models\Ciian\Role;
use App\Models\Ciian\User;

/**
 * Shapes ciian_users rows for the Users index.
 */
class UserIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function users(): array
    {
        return array_values(
            User::query()
                ->with('role')
                ->orderBy('username')
                ->get()
                ->map(fn (User $user): array => $this->present($user))
                ->all(),
        );
    }

    /**
     * The roles the create form can assign, in the order they are offered.
     *
     * @return list<array<string, mixed>>
     */
    public function roles(): array
    {
        return array_values(
            Role::query()
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role): array => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'slug' => $role->slug,
                    'icon' => $role->icon,
                    'description' => $role->description,
                ])
                ->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function present(User $user): array
    {
        return [
            'key' => "user-{$user->id}",
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            // The role's own icon travels with it so the badge matches whatever
            // the role was given, rather than a name-to-icon guess in the page.
            'role' => [
                'id' => $user->role->id,
                'name' => $user->role->name,
                'slug' => $user->role->slug,
                'icon' => $user->role->icon,
            ],
            // Formatted here so every client renders the same string; the index
            // only ever displays it, and sorting uses `joined_at`.
            'joined' => $user->created_at?->format('M j, Y'),
            'joined_at' => $user->created_at?->getTimestamp(),
        ];
    }
}
