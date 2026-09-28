<?php

namespace App\Http\Requests\Products\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A blank `sku`/`category_id` arrives as `''`/`0` from the form, not `null` —
     * normalize both to `null` first so `nullable` actually treats them as absent
     * (an unnormalized `''` would otherwise still hit `unique:products,sku` and
     * only let one product ever have a blank SKU).
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'sku' => $this->filled('sku') ? $this->sku : null,
            'category_id' => $this->filled('category_id') && (int) $this->category_id !== 0 ? $this->category_id : null,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:products,name'],
            'sku' => ['nullable', 'string', 'max:255', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:products,barcode'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'minimum_stock_level' => ['nullable', 'numeric', 'min:0'],
            'manage_stock' => ['required', 'boolean'],
            'is_for_sale' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'warranty_period_months' => ['nullable', 'integer', 'min:0'],
            'has_installation_service' => ['required', 'boolean'],
            'emi_available' => ['required', 'boolean'],
            'track_serial_number' => ['required', 'boolean'],
            'opening_stock' => ['nullable', 'numeric'],
            'opening_stock_cost' => ['required_if:opening_stock,!=,0', 'nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'max:4096'],
            'service_plan' => ['nullable', 'array'],
            'service_plan.*.period_months' => ['required', 'integer', 'min:1'],
            'service_plan.*.free_quota' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
