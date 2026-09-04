<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use App\Rules\OpeningStockEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
        /** @var Product $product */
        $product = $this->route('product');

        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($product->id)],
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
            'opening_stock' => ['nullable', 'numeric', new OpeningStockEditable($product)],
            'opening_stock_cost' => ['required_if:opening_stock,!=,0', 'nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
