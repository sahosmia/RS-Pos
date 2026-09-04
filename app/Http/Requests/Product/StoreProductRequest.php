<?php

namespace App\Http\Requests\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:255', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:products,barcode'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
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
        ];
    }
}
