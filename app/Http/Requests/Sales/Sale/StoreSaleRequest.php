<?php

namespace App\Http\Requests\Sales\Sale;

use App\Rules\ContactMustBeTypeRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
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
            'customer_id' => ['required', 'integer', 'exists:contacts,id', new ContactMustBeTypeRule('customer')],
            'sale_date' => ['required', 'date'],
            'status' => ['required', 'in:draft,quotation,confirmed'],
            'source' => ['nullable', 'in:manual,imported'],
            'discount_type' => ['nullable', 'in:flat,percentage'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'valid_until' => ['required_if:status,quotation', 'nullable', 'date', 'after_or_equal:sale_date'],
            'financing_type' => ['nullable', 'in:one_time,emi'],
            'installment_count' => ['nullable', 'required_if:financing_type,emi', 'integer', 'min:1'],
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.installation_required' => ['nullable', 'boolean'],
            'items.*.installation_charge' => ['nullable', 'numeric', 'min:0'],
            'items.*.note' => ['nullable', 'string', 'max:255'],
            'items.*.serial_numbers' => ['nullable', 'array'],
            'items.*.serial_numbers.*' => ['nullable', 'string', 'max:100'],
        ];
    }
}
