<?php

namespace App\Http\Requests\Purchases\Purchase;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The corrected unit price of each line of a Received purchase, and why. Permission comes from the route's `module:purchase,edit`.
 */
class AdjustPurchaseCostRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', Rule::exists('purchase_items', 'id')->where('purchase_id', $this->route('purchase')?->id)],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
