<?php

namespace App\Http\Requests\Concerns;

use App\Support\ColumnTypes;
use Illuminate\Validation\Rule;

trait ValidatesTableColumns
{
    /**
     * Shared validation rules for nested shape column payloads.
     *
     * @return array<string, mixed>
     */
    protected function tableShapeRules(string $prefix = 'shape'): array
    {
        return [
            $prefix => ['required', 'array'],
            "{$prefix}.columns" => ['required', 'array', 'min:1'],
            "{$prefix}.columns.*.name" => ['required', 'string', 'max:255', 'regex:/^[a-z][a-z0-9_]*$/'],
            "{$prefix}.columns.*.type" => ['required', 'string', Rule::in(ColumnTypes::types())],
            "{$prefix}.columns.*.nullable" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.auto_increment" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.unique" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.indexed" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.unsigned" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.use_current" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.use_current_on_update" => ['sometimes', 'boolean'],
            "{$prefix}.columns.*.default" => ['sometimes', 'nullable'],
            "{$prefix}.columns.*.length" => ['sometimes', 'nullable', 'integer', 'min:1'],
            "{$prefix}.columns.*.precision" => ['sometimes', 'nullable', 'integer', 'min:0'],
            "{$prefix}.columns.*.scale" => ['sometimes', 'nullable', 'integer', 'min:0'],
            "{$prefix}.columns.*.dimensions" => ['sometimes', 'nullable', 'integer', 'min:1'],
            "{$prefix}.columns.*.references" => ['sometimes', 'nullable', 'string', 'max:255'],
            "{$prefix}.columns.*.on_delete" => ['sometimes', 'nullable', 'string', Rule::in(ColumnTypes::ON_DELETE_ACTIONS)],
            "{$prefix}.columns.*.values" => ['sometimes', 'nullable', 'array'],
            "{$prefix}.columns.*.values.*" => ['string', 'max:255'],
            "{$prefix}.timestamps" => ['sometimes', 'boolean'],
            "{$prefix}.primary" => ['sometimes', 'array'],
            "{$prefix}.primary.*" => ['string'],
            "{$prefix}.tbl_name" => ['sometimes', 'string', 'max:255'],
            "{$prefix}.tbl_db_name" => ['sometimes', 'string', 'max:255'],
            "{$prefix}.tbl_sys" => ['sometimes', 'string', 'max:255'],
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     slug?: string,
     *     system?: string,
     *     icon?: string|null,
     *     shape: array<string, mixed>
     * }
     */
    public function tablePayload(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return [
            'name' => (string) $validated['name'],
            ...array_key_exists('slug', $validated) ? ['slug' => (string) $validated['slug']] : [],
            ...array_key_exists('system', $validated) ? ['system' => (string) $validated['system']] : [],
            ...array_key_exists('icon', $validated) ? ['icon' => $validated['icon']] : [],
            'shape' => is_array($validated['shape'] ?? null) ? $validated['shape'] : [],
        ];
    }
}
