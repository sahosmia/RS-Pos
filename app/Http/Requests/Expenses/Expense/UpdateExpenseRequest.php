<?php

namespace App\Http\Requests\Expenses\Expense;

use App\Rules\ContactMustBeTypeRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
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
        return [
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id', new ContactMustBeTypeRule('supplier')],
            'total_amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:expense_date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ];
    }
}
