<?php

namespace App\Http\Requests\Ciian;

use App\Concerns\ProfileValidationRules;
use App\Models\Ciian\Role;
use App\Models\Ciian\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.manage') ?? false;
    }

    /**
     * The password is not editable here — resetting one is its own action.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->target()?->id),
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
     * Refuse a change that would leave the platform with no Root account.
     *
     * Nothing else guards this: Root is the only role seeded with permissions,
     * so demoting the last account holding it locks everyone out of the admin
     * with no way back in through the UI.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->target();

            if ($user === null) {
                return;
            }

            $rootRoleId = Role::query()->where('slug', Role::ROOT)->value('id');

            if ($rootRoleId === null || $user->role_id !== $rootRoleId) {
                return;
            }

            if ((int) $this->input('role_id') === (int) $rootRoleId) {
                return;
            }

            $remaining = User::query()
                ->where('role_id', $rootRoleId)
                ->whereKeyNot($user->getKey())
                ->count();

            if ($remaining === 0) {
                $validator->errors()->add(
                    'role_id',
                    __('This is the last Root account. Give another account the Root role first.'),
                );
            }
        });
    }

    /**
     * @return array{username: string, email: string, role_id: int}
     */
    public function userPayload(): array
    {
        $validated = $this->validated();

        return [
            'username' => (string) $validated['username'],
            'email' => (string) $validated['email'],
            'role_id' => (int) $validated['role_id'],
        ];
    }

    /**
     * The account being edited, resolved from the route binding.
     */
    private function target(): ?User
    {
        $user = $this->route('user');

        return $user instanceof User ? $user : null;
    }
}
