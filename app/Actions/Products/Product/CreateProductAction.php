<?php

namespace App\Actions\Products\Product;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateProductAction
{
    public function __construct(
        private StockService $stock,
        private PostOpeningStockJournal $postOpeningStockJournal,
    ) {}

    /**
     * @param  array{name: string, sku?: string|null, barcode?: string|null, category_id?: int|null, brand_id?: int|null, unit_id: int, selling_price: float|string, minimum_stock_level?: float|string|null, manage_stock?: bool, is_for_sale?: bool, is_active?: bool, warranty_period_months?: int|null, has_installation_service?: bool, emi_available?: bool, track_serial_number?: bool, opening_stock?: float|string|null, opening_stock_cost?: float|string|null, service_plan?: array<int, array{period_months: int|string, free_quota: int|string}>}  $data
     */
    public function execute(array $data, ?UploadedFile $image = null): Product
    {
        return DB::transaction(function () use ($data, $image) {
            $product = Product::create([
                'name' => $data['name'],
                'sku' => $data['sku'] ?? Product::generateUniqueSku(),
                'barcode' => $data['barcode'] ?? null,
                'category_id' => $data['category_id'] ?? null,
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
            $openingStockCost = (float) ($data['opening_stock_cost'] ?? 0);

            if ($openingStock !== 0.0) {
                $this->stock->increase($product, $openingStock, StockMovementType::OpeningStock);
                $product->forceFill(['avg_cost' => $openingStockCost])->save();
                $this->postOpeningStockJournal->execute($product, $openingStock, $openingStockCost);
            }

            ServicePlanSync::sync($product, $data['service_plan'] ?? []);

            if ($image !== null) {
                $product->addMedia($image)->toMediaCollection('images');
            }

            return $product;
        });
    }
}
