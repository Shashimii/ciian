<?php

namespace App\Actions\Role;

use App\Models\Ciian\Role;
use Illuminate\Validation\ValidationException;

class DeleteRole
{
    /**
     * Delete a role.
     *
     * Two roles are refused outright, and the index mirrors both with a
     * disabled lock rather than a control that fails on click:
     *
     * - A protected role (`can_delete: false`). Root and User ship that way
     *   from `SystemDefaultsSeeder`; deleting Root would strip the only role
     *   carrying permissions.
     * - A role some account still holds. `ciian_users.role_id` restricts on
     *   delete, so without this the database raises a foreign key error and
     *   the user gets a stack trace instead of a reason.
     */
    public function handle(Role $role): void
    {
        if (! $role->canDelete()) {
            throw ValidationException::withMessages([
                'role' => __('This is a protected platform role and cannot be deleted.'),
            ]);
        }

        $holders = $role->users()->count();

        if ($holders > 0) {
            throw ValidationException::withMessages([
                'role' => __(':count account(s) still use this role. Move them to another role first.', [
                    'count' => $holders,
                ]),
            ]);
        }

        $role->delete();
    }
}
