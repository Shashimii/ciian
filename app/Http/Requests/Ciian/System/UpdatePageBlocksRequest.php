<?php

namespace App\Http\Requests\Ciian\System;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePageBlocksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('systems.manage') ?? false;
    }

    /**
     * Structure only. Which component slugs actually exist is checked in
     * `SavePageDraft::saveBlocks()`, which can look them up, and the canonical
     * shape of a block is settled by `PageShapeBuilder`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'blocks' => ['present', 'array'],
            'blocks.*.block_id' => ['nullable', 'string', 'max:255'],
            'blocks.*.component' => ['required', 'string', 'max:255'],
            'blocks.*.props' => ['sometimes', 'array'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function blocks(): array
    {
        $blocks = $this->validated()['blocks'] ?? [];

        return is_array($blocks) ? array_values($blocks) : [];
    }
}
