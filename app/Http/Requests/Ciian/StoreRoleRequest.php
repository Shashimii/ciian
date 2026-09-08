<?php

namespace App\Http\Requests\Ciian;

use App\Models\Ciian\Permission;
use App\Models\Ciian\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('roles.manage') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique(Role::class, 'name')],
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique(Role::class, 'slug'),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['sometimes', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['integer', Rule::exists(Permission::class, 'id')],
        ];
    }

    /**
     * Permission ids to attach, deduplicated.
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
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => __('The slug may only use lowercase letters, numbers and underscores, starting with a letter.'),
            'permissions.*.exists' => __('One of those permissions no longer exists.'),
        ];
    }

    /**
     * @return array{name: string, slug: string, description: string|null, icon?: string}
     */
    public function rolePayload(): array
    {
        $validated = $this->validated();

        $payload = [
            'name' => (string) $validated['name'],
            'slug' => (string) $validated['slug'],
            'description' => $validated['description'] === null
                ? null
                : (string) $validated['description'],
        ];

        if (array_key_exists('icon', $validated) && $validated['icon'] !== null) {
            $payload['icon'] = (string) $validated['icon'];
        }

        return $payload;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('slug')) {
            $this->merge(['slug' => strtolower((string) $this->input('slug'))]);
        }
    }
}
