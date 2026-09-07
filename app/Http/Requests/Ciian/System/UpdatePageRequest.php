<?php

namespace App\Http\Requests\Ciian\System;

use App\Actions\System\SavePageDraft;
use App\Models\Ciian\System\Page;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePageRequest extends FormRequest
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
        $page = $this->routePage();
        $locked = app(SavePageDraft::class)->slugIsLocked($page);

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                // A locked slug is ignored below, so it need not be submitted.
                $locked ? 'nullable' : 'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::notIn([Page::INDEX_SLUG]),
                Rule::unique('ciian_sys_pg', 'slug')
                    ->where('system_id', $page->system_id)
                    ->ignore($page->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.not_in' => __('The slug [:slug] is reserved for the system\'s starting page.', [
                'slug' => Page::INDEX_SLUG,
            ]),
        ];
    }

    /**
     * Validated input with the slug dropped once it is locked.
     *
     * @return array{name: string, slug?: string}
     */
    public function pagePayload(): array
    {
        $validated = $this->validated();

        $payload = ['name' => (string) $validated['name']];

        if (! app(SavePageDraft::class)->slugIsLocked($this->routePage())) {
            $payload['slug'] = (string) $validated['slug'];
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

    private function routePage(): Page
    {
        $page = $this->route('page');

        return $page instanceof Page ? $page : new Page;
    }
}
