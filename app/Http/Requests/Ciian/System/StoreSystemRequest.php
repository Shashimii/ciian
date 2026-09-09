<?php

namespace App\Http\Requests\Ciian\System;

use App\Models\Ciian\System\Page;
use App\Support\SystemPagePath;
use App\Support\SystemUrlPrefix;
use App\Support\TagColors;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSystemRequest extends FormRequest
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
                Rule::notIn(SystemPagePath::RESERVED_FOLDERS),
                Rule::unique('ciian_sys', 'slug'),
                Rule::unique('ciian_config', 'sys_slug'),
            ],
            'prefix' => [
                'required',
                'string',
                'max:255',
                'regex:'.SystemUrlPrefix::PATTERN,
                Rule::notIn(SystemUrlPrefix::RESERVED),
                Rule::unique('ciian_sys', 'prefix'),
            ],
            'icon' => ['sometimes', 'string', 'max:255'],
            'color' => ['sometimes', 'string', Rule::in(TagColors::OPTIONS)],
            'description' => ['nullable', 'string', 'max:1000'],

            // Pages beyond the starting one, which every system gets anyway.
            'pages' => ['sometimes', 'array', 'max:50'],
            'pages.*.name' => ['required', 'string', 'max:255'],
            'pages.*.slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::notIn([Page::INDEX_SLUG]),
                'distinct',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'prefix.not_in' => __('That URL prefix is reserved by Ciian. Pick another.'),
            'prefix.regex' => __('The URL prefix may only use lowercase letters, numbers, dashes and underscores.'),
            'pages.*.slug.not_in' => __('The starting page is created automatically and owns that slug.'),
            'pages.*.slug.distinct' => __('Two pages cannot share a slug.'),
            'pages.*.slug.regex' => __('A page slug may only use lowercase letters, numbers and underscores.'),
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     slug: string,
     *     prefix: string,
     *     icon?: string|null,
     *     color?: string|null,
     *     description?: string|null,
     *     pages: list<array{name: string, slug: string}>
     * }
     */
    public function systemPayload(): array
    {
        $validated = $this->validated();

        $payload = [
            'name' => (string) $validated['name'],
            'slug' => (string) $validated['slug'],
            'prefix' => (string) $validated['prefix'],
        ];

        foreach (['icon', 'color', 'description'] as $option) {
            if (array_key_exists($option, $validated)) {
                $payload[$option] = $validated[$option] === null
                    ? null
                    : (string) $validated[$option];
            }
        }

        $payload['pages'] = is_array($validated['pages'] ?? null)
            ? array_values($validated['pages'])
            : [];

        return $payload;
    }

    protected function prepareForValidation(): void
    {
        foreach (['slug', 'prefix'] as $field) {
            if ($this->filled($field)) {
                $this->merge([
                    $field => strtolower((string) $this->input($field)),
                ]);
            }
        }
    }
}
