<?php

namespace App\Actions\Role;

use App\Models\Ciian\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteRole
{
    /**
     * Delete a role, moving any accounts that hold it to another role first.
     *
     * A protected role (`can_delete: false`) is refused outright — Root and
     * User ship that way from `SystemDefaultsSeeder`, and deleting Root would
     * strip the only role carrying permissions. The index mirrors that with a
     * disabled lock rather than a control that fails on click.
     *
     * A role accounts still hold is *not* refused; it needs a destination.
     * `ciian_users.role_id` restricts on delete, so the accounts have to move
     * before the row can go, and both halves share one transaction — a partial
     * move would leave accounts on a role that is about to disappear.
     */
    public function handle(Role $role, ?Role $reassignTo = null): void
    {
        if (! $role->canDelete()) {
            throw ValidationException::withMessages([
                'role' => __('This is a protected platform role and cannot be deleted.'),
            ]);
        }

        $holders = $role->users()->count();
        $moveTo = null;

        if ($holders > 0) {
            if ($reassignTo === null) {
                throw ValidationException::withMessages([
                    'reassign_to' => __(':count account(s) still use this role. Choose a role to move them to.', [
                        'count' => $holders,
                    ]),
                ]);
            }

            if ($reassignTo->is($role)) {
                throw ValidationException::withMessages([
                    'reassign_to' => __('Pick a different role to move those accounts to.'),
                ]);
            }

            $moveTo = $reassignTo;
        }

        // Null unless a move is actually required, so the transaction does not
        // have to re-derive whether one was asked for.
        DB::transaction(function () use ($role, $moveTo): void {
            if ($moveTo !== null) {
                $role->users()->update(['role_id' => $moveTo->getKey()]);
            }

            $role->delete();
        });
    }
}
