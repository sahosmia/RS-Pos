<?php

namespace App\Http\Requests\Products\Brand;

use App\Models\Brand;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Brand|null $brand */
        $brand = $this->route('brand');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('brands', 'name')->ignore($brand?->id)],
        ];
    }
}
