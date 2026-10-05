<?php

namespace App\Http\Requests\Purchases\Purchase;

use App\Http\Requests\Purchases\Purchase\Concerns\HasReceiptRules;
use App\Rules\ContactMustBeTypeRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    use HasReceiptRules;

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
            ...$this->receiptRules(),
            'supplier_id' => ['required', 'integer', 'exists:contacts,id', new ContactMustBeTypeRule('supplier')],
            'purchase_date' => ['required', 'date'],
            'status' => ['required', 'in:draft,ordered,received'],
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
