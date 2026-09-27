<?php

namespace App\Http\Requests\Expenses\ExpenseCategory;

use App\Models\ExpenseCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExpenseCategoryRequest extends FormRequest
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
        /** @var ExpenseCategory|null $expenseCategory */
        $expenseCategory = $this->route('expense_category');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('expense_categories', 'name')->ignore($expenseCategory?->id)],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:expense_categories,id',
                $expenseCategory ? Rule::notIn([$expenseCategory->id]) : 'nullable',
            ],
        ];
    }
}
