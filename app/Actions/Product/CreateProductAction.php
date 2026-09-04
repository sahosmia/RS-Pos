<?php

namespace App\Actions\Product;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateProductAction
{
    public function __construct(private StockService $stock) {}

    /**
     * @param  array{name: string, sku: string, barcode?: string|null, category_id: int, brand_id?: int|null, unit_id: int, selling_price: float|string, minimum_stock_level?: float|string|null, manage_stock?: bool, is_for_sale?: bool, is_active?: bool, warranty_period_months?: int|null, has_installation_service?: bool, emi_available?: bool, track_serial_number?: bool, opening_stock?: float|string|null, opening_stock_cost?: float|string|null}  $data
     */
    public function execute(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $product = Product::create([
                'name' => $data['name'],
                'sku' => $data['sku'],
                'barcode' => $data['barcode'] ?? null,
                'category_id' => $data['category_id'],
                'brand_id' => $data['brand_id'] ?? null,
                'unit_id' => $data['unit_id'],
                'selling_price' => $data['selling_price'],
                'minimum_stock_level' => $data['minimum_stock_level'] ?? 0,
                'manage_stock' => $data['manage_stock'] ?? true,
                'is_for_sale' => $data['is_for_sale'] ?? true,
                'is_active' => $data['is_active'] ?? true,
                'warranty_period_months' => $data['warranty_period_months'] ?? null,
                'has_installation_service' => $data['has_installation_service'] ?? false,
                'emi_available' => $data['emi_available'] ?? false,
                'track_serial_number' => $data['track_serial_number'] ?? false,
                'created_by' => Auth::id(),
            ]);

            $openingStock = (float) ($data['opening_stock'] ?? 0);

            if ($openingStock !== 0.0) {
                $this->stock->increase($product, $openingStock, StockMovementType::OpeningStock);
                $product->forceFill(['avg_cost' => (float) ($data['opening_stock_cost'] ?? 0)])->save();
            }

            return $product;
        });
    }
}
