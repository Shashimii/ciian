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
            'status' => ['required', 'string', Rule::in([User::STATUS_ACTIVE, User::STATUS_INACTIVE])],
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
            'status.in' => __('Pick whether this account is active.'),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->target();

            if ($user === null) {
                return;
            }

            $this->guardSelfDeactivation($validator, $user);
            $this->guardLastActiveRoot($validator, $user);
        });
    }

    /**
     * Deactivating yourself ends your own session on the next request, leaving
     * no way back in unless someone else can reactivate the account.
     */
    private function guardSelfDeactivation(Validator $validator, User $user): void
    {
        if ($this->input('status') !== User::STATUS_INACTIVE) {
            return;
        }

        if ($this->user()?->is($user) === true) {
            $validator->errors()->add(
                'status',
                __('You cannot deactivate your own account.'),
            );
        }
    }

    /**
     * The platform must keep at least one account that is both Root and active.
     *
     * Root is the only role seeded with permissions, so losing the last active
     * one locks everyone out of the admin with no way back in through the UI.
     * Demoting and deactivating are the two ways to lose it, so both are
     * checked against the same invariant.
     */
    private function guardLastActiveRoot(Validator $validator, User $user): void
    {
        $rootRoleId = Role::query()->where('slug', Role::ROOT)->value('id');

        if ($rootRoleId === null) {
            return;
        }

        $isActiveRoot = $user->role_id === (int) $rootRoleId && $user->isActive();

        if (! $isActiveRoot) {
            return;
        }

        $staysRoot = (int) $this->input('role_id') === (int) $rootRoleId;
        $staysActive = $this->input('status') === User::STATUS_ACTIVE;

        if ($staysRoot && $staysActive) {
            return;
        }

        $others = User::query()
            ->where('role_id', $rootRoleId)
            ->where('status', User::STATUS_ACTIVE)
            ->whereKeyNot($user->getKey())
            ->count();

        if ($others > 0) {
            return;
        }

        $validator->errors()->add(
            $staysRoot ? 'status' : 'role_id',
            __('This is the last active Root account. Give another account the Root role first.'),
        );
    }

    /**
     * @return array{username: string, email: string, role_id: int, status: string}
     */
    public function userPayload(): array
    {
        $validated = $this->validated();

        return [
            'username' => (string) $validated['username'],
            'email' => (string) $validated['email'],
            'role_id' => (int) $validated['role_id'],
            'status' => (string) $validated['status'],
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
