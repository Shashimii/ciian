<?php

namespace App\Http\Requests\Ciian\Database;

use App\Http\Requests\Concerns\ValidatesTableColumns;
use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\System;
use Closure;
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
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! $this->isAllowedSystem($value)) {
                        $fail(__('The selected system is invalid.'));
                    }
                },
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

    private function isAllowedSystem(string $value): bool
    {
        $ciianSlug = CiianConfig::query()->value('sys_slug') ?? InternalTable::TAG_CIIAN;

        if (in_array($value, [InternalTable::TAG_CIIAN, $ciianSlug], true)) {
            return true;
        }

        return System::query()->where('slug', $value)->exists();
    }
}
