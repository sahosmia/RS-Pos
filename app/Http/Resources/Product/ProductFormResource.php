<?php

namespace App\Http\Resources\Product;

use App\Models\Product;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Product $resource */
class ProductFormResource extends JsonResource
{
    public function toArray($request): array
    {
        $product = $this->resource;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'category_id' => $product->category_id,
            'brand_id' => $product->brand_id,
            'unit_id' => $product->unit_id,
            'selling_price' => $product->selling_price,
            'minimum_stock_level' => $product->minimum_stock_level,
            'manage_stock' => $product->manage_stock,
            'is_for_sale' => $product->is_for_sale,
            'is_active' => $product->is_active,
            'warranty_period_months' => $product->warranty_period_months,
            'has_installation_service' => $product->has_installation_service,
            'emi_available' => $product->emi_available,
            'track_serial_number' => $product->track_serial_number,
            'current_stock' => $product->current_stock,
            'can_set_opening_stock' => $product->canSetOpeningStock(),
            'image_url' => $product->getFirstMediaUrl('images') ?: null,
            'service_plan' => $product->servicePlanTemplates->map(fn ($template) => [
                'period_months' => $template->period_months,
                'free_quota' => $template->free_quota,
            ]),
        ];
    }
}
