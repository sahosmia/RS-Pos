<?php

namespace Database\Seeders;

use App\Actions\Products\Product\CreateProductAction;
use App\Actions\Products\Product\ServicePlanSync;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Seeder;

/**
 * The 10 hand-picked demo products the purchase/sale/return demo scenarios
 * reference by key. (The ~300-product bulk catalog is HomeApplianceProductSeeder.)
 */
class ProductSeeder extends Seeder
{
    /**
     * Serial-tracked products deliberately start with opening_stock 0 —
     * CreateProductAction's opening stock movement doesn't create
     * serial_numbers rows, so every serialized unit must enter through
     * a Purchase instead (which does), never opening stock.
     *
     * @var array<string, array<string, mixed>>
     */
    public const SPECS = [
        'walton_ac' => ['name' => 'Walton AC 1.5 Ton Inverter', 'sku' => 'WAL-AC-15T', 'category' => 'Air Conditioner Inverter', 'brand' => 'Walton', 'selling_price' => 46000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 5, 'opening_stock_cost' => 36000],
        'samsung_ac' => ['name' => 'Samsung AC 1 Ton Inverter', 'sku' => 'SAM-AC-1T', 'category' => 'Air Conditioner Inverter', 'brand' => 'Samsung', 'selling_price' => 50000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 4, 'opening_stock_cost' => 40000],
        'walton_fridge' => ['name' => 'Walton Refrigerator 300L', 'sku' => 'WAL-RF-300', 'category' => 'Refrigerator', 'brand' => 'Walton', 'selling_price' => 40000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
        'lg_fridge' => ['name' => 'LG Refrigerator 400L', 'sku' => 'LG-RF-400', 'category' => 'Refrigerator', 'brand' => 'Haier', 'selling_price' => 68000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
        'samsung_tv' => ['name' => 'Samsung LED TV 43"', 'sku' => 'SAM-TV-43', 'category' => 'Television', 'brand' => 'Samsung', 'selling_price' => 35000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
        'walton_tv' => ['name' => 'Walton LED TV 32"', 'sku' => 'WAL-TV-32', 'category' => 'Television', 'brand' => 'Walton', 'selling_price' => 19500, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true, 'opening_stock' => 0, 'opening_stock_cost' => 0],
        'vision_wm' => ['name' => 'Vision Washing Machine 7kg', 'sku' => 'VIS-WM-7', 'category' => 'Washing Machine Top Loading', 'brand' => 'Vision', 'selling_price' => 28000, 'warranty_period_months' => 12, 'has_installation_service' => true, 'track_serial_number' => false, 'opening_stock' => 5, 'opening_stock_cost' => 21000],
        'walton_microwave' => ['name' => 'Walton Microwave Oven 25L', 'sku' => 'WAL-MW-25', 'category' => 'Microwave Oven Solo', 'brand' => 'Walton', 'selling_price' => 11000, 'warranty_period_months' => 6, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 12, 'opening_stock_cost' => 7800],
        'singer_rice_cooker' => ['name' => 'Singer Rice Cooker 1.8L', 'sku' => 'SIN-RC-18', 'category' => 'Water Kettle', 'brand' => 'Midea', 'selling_price' => 2500, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 20, 'opening_stock_cost' => 1800],
        'vision_fan' => ['name' => 'Vision Ceiling Fan 56"', 'sku' => 'VIS-FN-56', 'category' => 'Air Circulator Fan', 'brand' => 'Vision', 'selling_price' => 1800, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false, 'opening_stock' => 30, 'opening_stock_cost' => 1150],
    ];

    /**
     * Free-service plan of each installable product (by SPECS key): consecutive periods, each with a number of free
     * visits. Sales snapshot this plan when they are confirmed, so the service-request demo has free visits to use.
     *
     * @var array<string, list<array{period_months: int, free_quota: int}>>
     */
    public const SERVICE_PLANS = [
        'walton_ac' => [['period_months' => 12, 'free_quota' => 2], ['period_months' => 12, 'free_quota' => 1]],
        'samsung_ac' => [['period_months' => 12, 'free_quota' => 2], ['period_months' => 12, 'free_quota' => 1]],
        'vision_wm' => [['period_months' => 12, 'free_quota' => 1]],
    ];

    public function run(): void
    {
        // Opening stock posts a journal entry, so the ledger accounts must exist too.
        $this->call([ChartOfAccountSeeder::class, CategorySeeder::class, UnitSeeder::class, BrandSeeder::class]);

        $createProduct = app(CreateProductAction::class);
        $categoryIds = Category::query()->pluck('id', 'name');
        $brandIds = Brand::query()->pluck('id', 'name');
        $pieceId = Unit::query()->where('name', 'Piece')->value('id');

        foreach (self::SPECS as $key => $spec) {
            $existing = Product::query()->where('sku', $spec['sku'])->first();

            if ($existing !== null) {
                // products seeded before service plans existed get theirs now
                if (isset(self::SERVICE_PLANS[$key]) && $existing->servicePlanTemplates()->doesntExist()) {
                    ServicePlanSync::sync($existing, self::SERVICE_PLANS[$key]);
                }

                continue;
            }

            // Safe fetch with fallback firstOrCreate in case name is missing
            $categoryId = $categoryIds->get($spec['category'])
                ?? Category::query()->firstOrCreate(['name' => $spec['category']])->id;

            $brandId = $brandIds->get($spec['brand'])
                ?? Brand::query()->firstOrCreate(['name' => $spec['brand']])->id;

            $createProduct->execute([
                'name' => $spec['name'],
                'sku' => $spec['sku'],
                'category_id' => $categoryId,
                'brand_id' => $brandId,
                'unit_id' => $pieceId,
                'selling_price' => $spec['selling_price'],
                'minimum_stock_level' => 3,
                'warranty_period_months' => $spec['warranty_period_months'],
                'has_installation_service' => $spec['has_installation_service'],
                'track_serial_number' => $spec['track_serial_number'],
                'opening_stock' => $spec['opening_stock'],
                'opening_stock_cost' => $spec['opening_stock_cost'],
                'service_plan' => self::SERVICE_PLANS[$key] ?? [],
            ]);
        }
    }
}
