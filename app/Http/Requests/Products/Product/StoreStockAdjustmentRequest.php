<?php

namespace App\Http\Requests\Products\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreStockAdjustmentRequest extends FormRequest
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
        $product = $this->route('product');
        $needsCost = $product && $product->avg_cost <= 0;

        return [
            'quantity' => ['required', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:255'],
            'unit_cost' => [$needsCost ? 'required' : 'nullable', 'numeric', 'gt:0'],
        ];
    }
}
