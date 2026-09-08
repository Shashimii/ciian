<?php

namespace App\Actions\User;

use App\Models\Ciian\User;
use Illuminate\Support\Facades\DB;

class UpdateUser
{
    /**
     * Apply an account's edited details.
     *
     * @param  array{username: string, email: string, role_id: int, status: string}  $payload
     */
    public function handle(User $user, array $payload): void
    {
        $wasActive = $user->isActive();

        $user->update($payload);

        if ($wasActive && ! $user->isActive()) {
            $this->endSessions($user);
        }
    }

    /**
     * Drop the account's sessions so deactivating takes effect immediately.
     *
     * Without this a signed-in user keeps working until their session expires,
     * because `Fortify::authenticateUsing` only runs at sign-in.
     */
    private function endSessions(User $user): void
    {
        // Only the database driver keeps sessions somewhere we can reach them
        // by user; on any other driver deactivation applies at next sign-in.
        if (config('session.driver') !== 'database') {
            return;
        }

        $table = config('session.table');

        DB::table(is_string($table) ? $table : 'sessions')
            ->where('user_id', $user->getKey())
            ->delete();
    }
}
