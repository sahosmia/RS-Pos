<?php

namespace App\Http\Requests\Sales\SalesOrder;

use App\Http\Requests\Sales\Concerns\ValidatesEmiTerms;
use App\Rules\ContactMustBeTypeRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * An order takes the same terms as the sale it will become: discounts, installation, warranty / service plan, planned
 * serial numbers and EMI — so the rules mirror StoreSaleRequest.
 */
class StoreSalesOrderRequest extends FormRequest
{
    use ValidatesEmiTerms;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validateEmiPeriods($validator),
            fn (Validator $validator) => $this->validateEmiHasProducts($validator),
        ];
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->emiTermRules(),
            'customer_id' => ['required', 'integer', 'exists:contacts,id', new ContactMustBeTypeRule('customer')],
            'order_date' => ['required', 'date'],
            'expected_delivery_date' => ['nullable', 'date', 'after_or_equal:order_date'],
            'discount_type' => ['nullable', 'in:flat,percentage'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_type' => ['nullable', 'in:flat,percentage'],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
            'items.*.installation_required' => ['nullable', 'boolean'],
            'items.*.installation_charge' => ['nullable', 'numeric', 'min:0'],
            'items.*.emi_financed' => ['nullable', 'boolean'],
            'items.*.warranty_months' => ['nullable', 'integer', 'min:0', 'max:600'],
            'items.*.service_plan_included' => ['nullable', 'boolean'],
            'items.*.note' => ['nullable', 'string', 'max:255'],
            'items.*.serial_numbers' => ['nullable', 'array'],
            'items.*.serial_numbers.*' => ['nullable', 'string', 'max:100'],
        ];
    }
}
