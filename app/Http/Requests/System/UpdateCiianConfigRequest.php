<?php

namespace App\Http\Requests\System;

use App\Models\Ciian\Core\CiianConfig;
use App\Support\TagColors;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCiianConfigRequest extends FormRequest
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
        $configId = CiianConfig::query()->value('id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'sys_slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('ciian_config', 'sys_slug')->ignore($configId),
                Rule::unique('ciian_sys', 'slug'),
            ],
            'icon' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', Rule::in(TagColors::OPTIONS)],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('sys_slug')) {
            $this->merge([
                'sys_slug' => strtolower((string) $this->input('sys_slug')),
            ]);
        }
    }
}
