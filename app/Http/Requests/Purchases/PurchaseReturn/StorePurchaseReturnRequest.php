<?php

namespace App\Http\Requests\Purchases\PurchaseReturn;

use App\Rules\PurchaseMustBeReceivedRule;
use App\Rules\ReturnQuantityWithinPurchasedRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseReturnRequest extends FormRequest
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
        $rules = [
            // Only a purchase the user may see: view_own cannot raise a return against someone else's bill.
            'purchase_id' => ['required', 'integer', Rule::exists('purchases', 'id')->when(! $this->user()?->can('purchase.view_all'), fn ($rule) => $rule->where('created_by', $this->user()?->id)), new PurchaseMustBeReceivedRule],
            'return_date' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => ['required', 'integer', 'exists:purchase_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ];

        foreach ((array) $this->input('items', []) as $index => $item) {
            $purchaseItemId = (int) ($item['purchase_item_id'] ?? 0);

            if ($purchaseItemId > 0) {
                $rules["items.{$index}.quantity"][] = new ReturnQuantityWithinPurchasedRule($purchaseItemId);
            }
        }

        return $rules;
    }
}
