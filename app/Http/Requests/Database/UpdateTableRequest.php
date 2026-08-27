<?php

namespace App\Http\Requests\Database;

use App\Support\ColumnTypes;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTableRequest extends FormRequest
{
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shape' => ['required', 'array'],
            'shape.columns' => ['nullable', 'array'],
            'shape.columns.*.name' => ['required_with:shape.columns', 'string', 'max:255'],
            'shape.columns.*.type' => ['required_with:shape.columns', 'string', Rule::in(ColumnTypes::types())],
            'shape.timestamps' => ['sometimes', 'boolean'],
            'shape.primary' => ['sometimes', 'array'],
            'shape.primary.*' => ['string'],
        ];
    }
}
