<?php

namespace App\Http\Requests\Ciian\Database;

use App\Http\Requests\Concerns\ValidatesTableColumns;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTableRequest extends FormRequest
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
            'icon' => ['sometimes', 'nullable', 'string', 'max:255'],
            ...$this->tableShapeRules(),
        ];
    }
}
