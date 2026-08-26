<?php

namespace Database\Seeders;

use App\Models\Ciian\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RootAccountSeeder extends Seeder
{
    /**
     * Seed the default Root user account.
     */
    public function run(): void
    {
        $rootRoleId = Role::query()
            ->where('slug', Role::ROOT)
            ->valueOrFail('id');

        User::query()->updateOrCreate(
            ['email' => 'root@email.com'],
            [
                'username' => 'Root',
                'role_id' => $rootRoleId,
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );
    }
}
