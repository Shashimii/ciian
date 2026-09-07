<?php

namespace App\Http\Requests\Ciian\System;

use App\Models\Ciian\System\System;
use App\Support\SystemPagePath;
use App\Support\SystemUrlPrefix;
use App\Support\TagColors;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSystemRequest extends FormRequest
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
        $system = $this->routeSystem();

        // The slug names the generated page folder and the prefix is the live URL,
        // so both lock on publish and any submitted value is ignored below.
        $locked = $system->isPublished() ? 'nullable' : 'required';

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                $locked,
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::notIn(SystemPagePath::RESERVED_FOLDERS),
                Rule::unique('ciian_sys', 'slug')->ignore($system->id),
                Rule::unique('ciian_config', 'sys_slug'),
            ],
            'prefix' => [
                $locked,
                'string',
                'max:255',
                'regex:'.SystemUrlPrefix::PATTERN,
                Rule::notIn(SystemUrlPrefix::RESERVED),
                Rule::unique('ciian_sys', 'prefix')->ignore($system->id),
            ],
            'icon' => ['sometimes', 'string', 'max:255'],
            'color' => ['sometimes', 'string', Rule::in(TagColors::OPTIONS)],
            'description' => ['nullable', 'string', 'max:1000'],
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
        ];
    }

    /**
     * Validated input with the slug and prefix dropped once the system is published.
     *
     * @return array<string, mixed>
     */
    public function systemPayload(): array
    {
        $payload = $this->validated();

        if ($this->routeSystem()->isPublished()) {
            unset($payload['slug'], $payload['prefix']);
        }

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

    private function routeSystem(): System
    {
        $system = $this->route('system');

        return $system instanceof System ? $system : new System;
    }
}
