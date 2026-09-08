<?php

namespace App\Http\Requests\Ciian;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Ciian\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.manage') ?? false;
    }

    /**
     * The username, email and password rules are the same ones registration
     * uses, so an account an admin creates is held to what a self-registered
     * one is.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role_id' => ['required', 'integer', Rule::exists(Role::class, 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role_id.required' => __('Pick a role for this account.'),
            'role_id.exists' => __('That role no longer exists.'),
        ];
    }

    /**
     * @return array{username: string, email: string, role_id: int, password: string}
     */
    public function userPayload(): array
    {
        $validated = $this->validated();

        return [
            'username' => (string) $validated['username'],
            'email' => (string) $validated['email'],
            'role_id' => (int) $validated['role_id'],
            // Hashed by the model's `password` cast, not here.
            'password' => (string) $validated['password'],
        ];
    }
}
