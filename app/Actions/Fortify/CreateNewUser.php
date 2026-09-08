<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Ciian\Role;
use App\Models\Ciian\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        // Roles come from SystemDefaultsSeeder and are never created here.
        // Minting one against an unseeded database would leave the platform
        // half-initialised — no permissions, no Root — while looking healthy.
        $userRoleId = Role::query()
            ->where('slug', Role::USER)
            ->valueOrFail('id');

        return User::create([
            'username' => $input['username'],
            'email' => $input['email'],
            'role_id' => $userRoleId,
            'password' => $input['password'],
        ]);
    }
}
