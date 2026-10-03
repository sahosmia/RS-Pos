<?php

namespace App\Http\Requests\OtherIncome;

use App\Models\OtherIncomeCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OtherIncomeCategoryRequest extends FormRequest
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
        /** @var OtherIncomeCategory|null $category */
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('other_income_categories', 'name')->ignore($category?->id)],
        ];
    }
}
