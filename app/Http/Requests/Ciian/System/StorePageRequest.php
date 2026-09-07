<?php

namespace App\Http\Requests\Ciian\System;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('systems.manage') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                // The starting page owns this slug and is created with the system.
                Rule::notIn([Page::INDEX_SLUG]),
                Rule::unique('ciian_sys_pg', 'slug')
                    ->where('system_id', $this->routeSystem()->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.not_in' => __('The slug [:slug] is reserved for the system\'s starting page.', [
                'slug' => Page::INDEX_SLUG,
            ]),
        ];
    }

    /**
     * @return array{name: string, slug: string}
     */
    public function pagePayload(): array
    {
        $validated = $this->validated();

        return [
            'name' => (string) $validated['name'],
            'slug' => (string) $validated['slug'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('slug')) {
            $this->merge([
                'slug' => strtolower((string) $this->input('slug')),
            ]);
        }
    }

    private function routeSystem(): System
    {
        $system = $this->route('system');

        return $system instanceof System ? $system : new System;
    }
}
