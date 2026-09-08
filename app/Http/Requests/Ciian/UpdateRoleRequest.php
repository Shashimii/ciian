<?php

namespace App\Http\Requests\Ciian;

use App\Models\Ciian\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('roles.manage') ?? false;
    }

    /**
     * The slug is deliberately absent and cannot be edited.
     *
     * It is the role's identity in code — `Role::ROOT` and `Role::USER` are
     * matched on it, and `SystemDefaultsSeeder` keys its `updateOrCreate` on
     * it — so renaming one would silently detach a shipped role from every
     * check that looks for it. Same rule as a published table's `tbl_db_name`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique(Role::class, 'name')->ignore($this->target()?->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['sometimes', 'string', 'max:255'],
        ];
    }

    /**
     * @return array{name: string, description: string|null, icon?: string}
     */
    public function rolePayload(): array
    {
        $validated = $this->validated();

        $payload = [
            'name' => (string) $validated['name'],
            'description' => $validated['description'] === null
                ? null
                : (string) $validated['description'],
        ];

        if (array_key_exists('icon', $validated) && $validated['icon'] !== null) {
            $payload['icon'] = (string) $validated['icon'];
        }

        return $payload;
    }

    /**
     * The role being edited, resolved from the route binding.
     */
    private function target(): ?Role
    {
        $role = $this->route('role');

        return $role instanceof Role ? $role : null;
    }
}
