<?php

namespace Database\Seeders;

use App\Actions\Products\Product\CreateProductAction;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::query()->pluck('id', 'name');
        $brands = Brand::query()->pluck('id', 'name');
        $piece = Unit::query()->where('name', 'Piece')->value('id') ?? Unit::query()->first()->id;

        $createProduct = app(CreateProductAction::class);

        $specs = [
            ['name' => 'Walton AC 1.5 Ton Inverter', 'sku' => 'WAL-AC-15T', 'category' => 'Air Conditioner', 'brand' => 'Walton', 'selling_price' => 46000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Samsung AC 1 Ton Inverter', 'sku' => 'SAM-AC-1T', 'category' => 'Air Conditioner', 'brand' => 'Samsung', 'selling_price' => 50000, 'warranty_period_months' => 24, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Walton Refrigerator 300L', 'sku' => 'WAL-RF-300', 'category' => 'Refrigerator', 'brand' => 'Walton', 'selling_price' => 40000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'LG Refrigerator 400L', 'sku' => 'LG-RF-400', 'category' => 'Refrigerator', 'brand' => 'LG', 'selling_price' => 68000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Samsung LED TV 43"', 'sku' => 'SAM-TV-43', 'category' => 'Television', 'brand' => 'Samsung', 'selling_price' => 35000, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Walton LED TV 32"', 'sku' => 'WAL-TV-32', 'category' => 'Television', 'brand' => 'Walton', 'selling_price' => 19500, 'warranty_period_months' => 12, 'has_installation_service' => false, 'track_serial_number' => true],
            ['name' => 'Vision Washing Machine 7kg', 'sku' => 'VIS-WM-7', 'category' => 'Washing Machine', 'brand' => 'Vision', 'selling_price' => 28000, 'warranty_period_months' => 12, 'has_installation_service' => true, 'track_serial_number' => false],
            ['name' => 'Walton Microwave Oven 25L', 'sku' => 'WAL-MW-25', 'category' => 'Kitchen Appliance', 'brand' => 'Walton', 'selling_price' => 11000, 'warranty_period_months' => 6, 'has_installation_service' => false, 'track_serial_number' => false],
            ['name' => 'Singer Rice Cooker 1.8L', 'sku' => 'SIN-RC-18', 'category' => 'Kitchen Appliance', 'brand' => 'Singer', 'selling_price' => 2500, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false],
            ['name' => 'Vision Ceiling Fan 56"', 'sku' => 'VIS-FN-56', 'category' => 'Fan', 'brand' => 'Vision', 'selling_price' => 1800, 'warranty_period_months' => null, 'has_installation_service' => false, 'track_serial_number' => false],
        ];

        foreach ($specs as $spec) {
            $createProduct->execute([
                'name' => $spec['name'],
                'sku' => $spec['sku'],
                'category_id' => $categories[$spec['category']] ?? null,
                'brand_id' => $brands[$spec['brand']] ?? null,
                'unit_id' => $piece,
                'selling_price' => $spec['selling_price'],
                'minimum_stock_level' => 3,
                'warranty_period_months' => $spec['warranty_period_months'],
                'has_installation_service' => $spec['has_installation_service'],
                'track_serial_number' => $spec['track_serial_number'],
                'opening_stock' => 0,
                'opening_stock_cost' => 0,
            ]);
        }
    }
}
