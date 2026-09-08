<?php

namespace App\Support;

use App\Models\Ciian\Role;
use App\Models\Ciian\User;
use Illuminate\Support\Facades\Auth;

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
        // Resolved once rather than per row: whether an account can be deleted
        // depends on who is asking and on how many Root accounts are left.
        $actorId = Auth::id();
        $rootRoleId = Role::query()->where('slug', Role::ROOT)->value('id');
        $rootCount = $rootRoleId === null
            ? 0
            : User::query()->where('role_id', $rootRoleId)->count();

        return array_values(
            User::query()
                ->with('role')
                ->orderBy('username')
                ->get()
                ->map(fn (User $user): array => $this->present(
                    $user,
                    $this->deleteBlockFor($user, $actorId, $rootRoleId, $rootCount),
                ))
                ->all(),
        );
    }

    /**
     * Why this account cannot be deleted, or null when it can.
     *
     * The string is the tooltip on the row's disabled lock, so it has to read
     * as a reason on its own — it is the only explanation the user gets.
     * `App\Actions\User\DeleteUser` refuses the same two cases server-side.
     */
    private function deleteBlockFor(
        User $user,
        int|string|null $actorId,
        ?int $rootRoleId,
        int $rootCount,
    ): ?string {
        if ($actorId !== null && (int) $actorId === $user->id) {
            return __('Your Account');
        }

        if ($rootRoleId !== null && $user->role_id === $rootRoleId && $rootCount <= 1) {
            return __('Last Root Account');
        }

        return null;
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
    public function present(User $user, ?string $deleteBlock = null): array
    {
        return [
            'can_delete' => $deleteBlock === null,
            'delete_block' => $deleteBlock,
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
