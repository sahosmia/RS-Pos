<?php

namespace App\Http\Requests\Products\Category;

use App\Models\Category;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
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
        /** @var Category|null $category */
        $category = $this->route('category');
        $parentId = $this->input('parent_id');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where(fn ($query) => $parentId ? $query->where('parent_id', $parentId) : $query->whereNull('parent_id'))
                    ->ignore($category?->id),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
                $category ? Rule::notIn([$category->id]) : 'nullable',
            ],
        ];
    }
}
