<?php

namespace App\Http\Requests\Ciian\Component;

use Illuminate\Foundation\Http\FormRequest;

class UploadComponentRequest extends FormRequest
{
    /**
     * The route is already gated by the `components.manage` permission.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // The file's contents are validated by ComponentShapeBuilder; these rules
            // only keep obviously wrong uploads from reaching it.
            'file' => ['required', 'file', 'max:512', 'extensions:yaml,yml'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => __('Choose a component definition to upload.'),
            'file.extensions' => __('The definition must be a .yaml or .yml file.'),
            'file.max' => __('The definition must be smaller than 512 KB.'),
        ];
    }

    /**
     * The uploaded definition's contents.
     */
    public function definitionYaml(): string
    {
        return (string) $this->file('file')?->get();
    }
}
