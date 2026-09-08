<?php

namespace App\Http\Requests\Ciian;

use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['integer', Rule::exists(Permission::class, 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'permissions.*.exists' => __('One of those permissions no longer exists.'),
        ];
    }

    /**
     * Root's permissions belong to the seeder, not to this form.
     *
     * `SystemDefaultsSeeder::seedRoles()` calls `permissions()->sync()` on the
     * Root role every time it runs, so a change made here would be reverted by
     * the next `db:seed`. Refusing outright beats letting someone make an edit
     * that quietly disappears later.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $role = $this->target();

            if ($role === null) {
                return;
            }

            if ($role->isRoot() && $this->has('permissions')) {
                $validator->errors()->add(
                    'permissions',
                    __('Root\'s permissions are managed by the seeder and cannot be changed here.'),
                );
            }

            $this->guardSeededDetails($validator, $role);
        });
    }

    /**
     * A protected role's name, description and icon belong to the seeder.
     *
     * `SystemDefaultsSeeder::seedRoles()` calls `updateOrCreate` keyed on the
     * slug with all three of those fields, so a change made here is rewritten
     * by the next `db:seed`. Compared rather than refused outright because the
     * form always submits `name` — only an actual change is rejected.
     */
    private function guardSeededDetails(Validator $validator, Role $role): void
    {
        if ($role->canDelete()) {
            return;
        }

        $message = __('This is a protected platform role. Its details are written by the seeder and cannot be changed here.');

        if ((string) $this->input('name') !== $role->name) {
            $validator->errors()->add('name', $message);
        }

        if ((string) $this->input('description', '') !== (string) $role->description) {
            $validator->errors()->add('description', $message);
        }

        if ($this->has('icon') && (string) $this->input('icon') !== $role->icon) {
            $validator->errors()->add('icon', $message);
        }
    }

    /**
     * Permission ids to attach, deduplicated. Empty when the form omitted them,
     * which for every role but Root means "detach everything".
     *
     * @return list<int>
     */
    public function permissionIds(): array
    {
        $ids = $this->validated()['permissions'] ?? [];

        if (! is_array($ids)) {
            return [];
        }

        return array_values(array_unique(array_map('intval', $ids)));
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
