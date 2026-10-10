<?php

namespace App\Http\Resources\Product;

use App\Models\Product;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Product $resource */
class ProductListResource extends JsonResource
{
    public function toArray($request): array
    {
        $product = $this->resource;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'category' => $product->category?->only(['id', 'name']),
            'brand' => $product->brand?->only(['id', 'name']),
            'unit' => $product->unit->only(['id', 'name']),
            'avg_cost' => $product->avg_cost,
            'selling_price' => $product->selling_price,
            'current_stock' => $product->current_stock,
            'minimum_stock_level' => $product->minimum_stock_level,
            'stock_status' => $product->stock_status,
            'profit_margin' => $product->profit_margin,
            'manage_stock' => $product->manage_stock,
            'is_for_sale' => $product->is_for_sale,
            'is_active' => $product->is_active,
            'track_serial_number' => $product->track_serial_number,
            'can_set_opening_stock' => ! $product->has_stock_movements, // from withExists(), no per-row query
            'image_url' => $product->imageUrl(),
        ];
    }
}
