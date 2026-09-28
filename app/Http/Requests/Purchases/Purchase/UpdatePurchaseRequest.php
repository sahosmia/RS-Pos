<?php

namespace App\Http\Requests\Purchases\Purchase;

use App\Rules\ContactMustBeTypeRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseRequest extends FormRequest
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
            'supplier_id' => ['required', 'integer', 'exists:contacts,id', new ContactMustBeTypeRule('supplier')],
            'purchase_date' => ['required', 'date'],
            'status' => ['required', 'in:draft,ordered'],
            'discount_type' => ['nullable', 'in:flat,percentage'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.original_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_type' => ['nullable', 'in:flat,percentage'],
            'items.*.discount_value' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
