<?php

namespace App\Http\Requests\Database;

use App\Http\Requests\Concerns\ValidatesTableColumns;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTableRequest extends FormRequest
{
    use ValidatesTableColumns;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('tables.manage') ?? false;
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
                Rule::unique('ciian_int_tbl', 'slug'),
                Rule::unique('ciian_sys_tbl', 'slug'),
            ],
            'system' => [
                'required',
                'string',
                'max:255',
                Rule::exists('ciian_sys', 'slug'),
            ],
            'icon' => ['nullable', 'string', 'max:255'],
            ...$this->tableShapeRules(),
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'system.exists' => __('Select a created system. Create one under Systems first.'),
        ];
    }
}
