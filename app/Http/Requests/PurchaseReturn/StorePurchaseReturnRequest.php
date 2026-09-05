<?php

namespace App\Http\Requests\PurchaseReturn;

use App\Rules\PurchaseMustBeReceivedRule;
use App\Rules\ReturnQuantityWithinPurchasedRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'purchase_id' => ['required', 'integer', 'exists:purchases,id', new PurchaseMustBeReceivedRule],
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
