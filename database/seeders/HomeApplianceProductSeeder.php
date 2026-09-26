<?php

namespace Database\Seeders;

use App\Actions\Products\Product\CreateProductAction;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Seeder;

/**
 * Bulk demo catalog (doc/corrections2.md #7) — ~300 home-appliance products
 * across the shop's core categories, so list/export/pagination pages have a
 * realistic amount of data to browse instead of `DummyDataSeeder`'s 10
 * hand-picked ones (which stay as-is — later seeder methods in that class
 * reference those 10 by key for the demo purchases/sales/returns, so this
 * runs as its own separate seeder rather than folding into it).
 *
 * Every product goes through `CreateProductAction` like the rest of the app
 * does (never a raw `Product::create()`), so its opening stock gets a real
 * `stock_movements` row and a balanced journal entry — otherwise these 300
 * products would carry stock the Balance Sheet's Assets total didn't agree
 * with (CLAUDE.md's "no money-movement without JournalService::post()" rule).
 */
class HomeApplianceProductSeeder extends Seeder
{
    private const TARGET_PER_CATEGORY = 75;

    /**
     * `category => [capacities, types, price range, cost ratio, stock range]`.
     * Price/cost figures are rough BDT retail ranges for each appliance type.
     *
     * @var array<string, array{capacities: list<string>, types: list<string>, price: array{int, int}, costRatio: float, stock: array{int, int}}>
     */
    private const CATEGORY_SPECS = [
        'Refrigerator' => [
            'capacities' => ['150L', '200L', '253L', '300L', '350L', '400L', '450L', '500L'],
            'types' => ['Direct Cool', 'No Frost', 'Side-by-Side'],
            'price' => [22000, 95000],
            'costRatio' => 0.75,
            'stock' => [3, 25],
        ],
        'Air Conditioner' => [
            'capacities' => ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton'],
            'types' => ['Split', 'Inverter Split', 'Window'],
            'price' => [35000, 75000],
            'costRatio' => 0.78,
            'stock' => [2, 15],
        ],
        'Washing Machine' => [
            'capacities' => ['6kg', '7kg', '8kg', '9kg', '10kg'],
            'types' => ['Top Load', 'Front Load', 'Semi-Automatic', 'Fully Automatic'],
            'price' => [14000, 48000],
            'costRatio' => 0.76,
            'stock' => [3, 20],
        ],
        'Kitchen Appliance' => [
            'capacities' => ['20L', '23L', '25L', '28L', '30L'],
            'types' => ['Microwave Oven', 'Convection Oven', 'Grill Microwave', 'Electric Oven'],
            'price' => [3000, 16000],
            'costRatio' => 0.72,
            'stock' => [5, 40],
        ],
    ];

    /**
     * @var list<string>
     */
    private const BRANDS = ['Walton', 'Samsung', 'LG', 'Vision', 'Singer', 'Jamuna', 'Minister', 'Marcel'];

    public function run(): void
    {
        $createProduct = app(CreateProductAction::class);
        $piece = Unit::query()->firstOrCreate(['name' => 'Piece'])->id;
        $brands = collect(self::BRANDS)->mapWithKeys(fn (string $name) => [$name => Brand::query()->firstOrCreate(['name' => $name])->id]);

        foreach (self::CATEGORY_SPECS as $categoryName => $spec) {
            $categoryId = Category::query()->firstOrCreate(['name' => $categoryName])->id;
            $created = 0;
            $skuPrefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $categoryName), 0, 3));

            foreach ($this->combinations($spec['capacities'], $spec['types'], $brands->keys()->all()) as [$capacity, $type, $brand]) {
                if ($created >= self::TARGET_PER_CATEGORY) {
                    break;
                }

                $created++;
                $sku = sprintf('%s-%s-%03d', $skuPrefix, strtoupper(substr($brand, 0, 3)), $created);

                if (Product::query()->where('sku', $sku)->exists()) {
                    continue;
                }

                $sellingPrice = $this->priceFor($spec['price'], $created);
                $openingStockCost = round($sellingPrice * $spec['costRatio'], 2);
                $openingStock = $spec['stock'][0] + ($created % ($spec['stock'][1] - $spec['stock'][0] + 1));

                $createProduct->execute([
                    'name' => "{$brand} {$categoryName} {$capacity} {$type}",
                    'sku' => $sku,
                    'category_id' => $categoryId,
                    'brand_id' => $brands[$brand],
                    'unit_id' => $piece,
                    'selling_price' => $sellingPrice,
                    'minimum_stock_level' => 5,
                    'opening_stock' => $openingStock,
                    'opening_stock_cost' => $openingStockCost,
                ]);
            }
        }
    }

    /**
     * Every capacity × type × brand combination, in a fixed but shuffled-looking
     * order (not grouped by brand/capacity) so the 75-per-category cutoff still
     * produces a realistic spread instead of only the first brand's lineup.
     *
     * @param  list<string>  $capacities
     * @param  list<string>  $types
     * @param  list<string>  $brands
     * @return list<array{0: string, 1: string, 2: string}>
     */
    private function combinations(array $capacities, array $types, array $brands): array
    {
        // Brand is the innermost loop — every capacity×type pair cycles through
        // all brands before moving on, so the first N combinations (whatever N
        // the per-category cutoff ends up being) still span every brand instead
        // of exhausting one brand's whole lineup before starting the next.
        $combinations = [];

        foreach ($capacities as $capacity) {
            foreach ($types as $type) {
                foreach ($brands as $brand) {
                    $combinations[] = [$capacity, $type, $brand];
                }
            }
        }

        return $combinations;
    }

    /**
     * A deterministic price within `[$min, $max]` that varies by `$seed` instead
     * of every product in a category costing exactly the same.
     *
     * @param  array{int, int}  $range
     */
    private function priceFor(array $range, int $seed): float
    {
        [$min, $max] = $range;
        $step = ($max - $min) / self::TARGET_PER_CATEGORY;

        return round($min + ($step * ($seed % self::TARGET_PER_CATEGORY)), -2);
    }
}
