<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Backs the async Product picker in the Purchase/Sale forms
 * (doc/corrections2.md #8) — those forms used to preload every product
 * (fine at a handful of rows, not at 300+); this returns just a capped,
 * name/SKU/barcode-matched page instead. The frontend debounces (~350ms)
 * before firing this, so a page load never queries per keystroke even
 * though there's no minimum-length gate (doc/corrections2.md's follow-up
 * dropped that requirement).
 */
class ProductSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:255'],
        ]);

        $search = $validated['q'];

        $products = Product::query()
            ->where('is_active', true)
            ->where(function (Builder $query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            })
            ->withCount('servicePlanTemplates')
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'avg_cost', 'current_stock', 'track_serial_number', 'has_installation_service', 'warranty_period_months']);

        return response()->json([
            'data' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'selling_price' => (float) $product->selling_price,
                'avg_cost' => (float) $product->avg_cost,
                'current_stock' => (float) $product->current_stock,
                'track_serial_number' => $product->track_serial_number,
                'has_installation_service' => $product->has_installation_service,
                'warranty_period_months' => $product->warranty_period_months,
                'service_plan_templates_count' => $product->service_plan_templates_count,
            ]),
        ]);
    }
}
