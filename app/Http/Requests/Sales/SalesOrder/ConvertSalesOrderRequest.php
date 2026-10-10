<?php

namespace App\Http\Requests\Sales\SalesOrder;

use App\Http\Requests\Sales\Concerns\ValidatesEmiTerms;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Confirming an order as a sale. The Confirm page sends the whole (possibly edited) sale — items, discounts, EMI,
 * date and any payment on top of the advance. A bare request (no `items`) converts the order exactly as it was
 * booked; `serial_numbers` (keyed by sales_order_item id) then says which serial(s) each line sells.
 */
class ConvertSalesOrderRequest extends FormRequest
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
            'sale_date' => ['nullable', 'date'],
            'discount_type' => ['nullable', 'in:flat,percentage'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'payments' => ['nullable', 'array'],
            'payments.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            // Keyed by sales_order_item id (the bare convert).
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['array'],
            'serial_numbers.*.*' => ['string'],
            // The edited sale (the Confirm page).
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.product_id' => ['required_with:items', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
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
