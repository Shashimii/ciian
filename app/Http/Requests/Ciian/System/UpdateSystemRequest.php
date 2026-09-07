<?php

namespace App\Http\Requests\Ciian\System;

use App\Models\Ciian\System\System;
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

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                // A published system is served from its slug, so it locks on publish
                // and any submitted value is ignored below.
                $system->isPublished() ? 'nullable' : 'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('ciian_sys', 'slug')->ignore($system->id),
                Rule::unique('ciian_config', 'sys_slug'),
            ],
            'icon' => ['sometimes', 'string', 'max:255'],
            'color' => ['sometimes', 'string', Rule::in(TagColors::OPTIONS)],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Validated input with the slug dropped once the system is published.
     *
     * @return array<string, mixed>
     */
    public function systemPayload(): array
    {
        $payload = $this->validated();

        if ($this->routeSystem()->isPublished()) {
            unset($payload['slug']);
        }

        return $payload;
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
