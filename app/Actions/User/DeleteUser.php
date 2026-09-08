<?php

namespace App\Actions\User;

use App\Models\Ciian\Role;
use App\Models\Ciian\User;
use Illuminate\Validation\ValidationException;

class DeleteUser
{
    /**
     * Delete a platform account.
     *
     * Two accounts are refused outright, and the UI mirrors both with a disabled
     * lock rather than a control that fails on click:
     *
     * - The actor's own account, which would end their session mid-request.
     * - The last account that is both Root and active. Root is the only role
     *   seeded with permissions, and a deactivated one cannot sign in, so
     *   losing the final active one locks everyone out of the admin.
     */
    public function handle(User $user, ?User $actor = null): void
    {
        if ($actor !== null && $actor->is($user)) {
            throw ValidationException::withMessages([
                'user' => __('You cannot delete your own account.'),
            ]);
        }

        $rootRoleId = Role::query()->where('slug', Role::ROOT)->value('id');

        if ($rootRoleId !== null && $user->role_id === $rootRoleId && $user->isActive()) {
            $remaining = User::query()
                ->where('role_id', $rootRoleId)
                ->where('status', User::STATUS_ACTIVE)
                ->whereKeyNot($user->getKey())
                ->count();

            if ($remaining === 0) {
                throw ValidationException::withMessages([
                    'user' => __('This is the last active Root account. Give another account the Root role first.'),
                ]);
            }
        }

        $user->delete();
    }
}
