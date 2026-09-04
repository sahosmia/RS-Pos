<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true),
            'sku' => fake()->unique()->bothify('SKU-#####'),
            'barcode' => null,
            'category_id' => Category::factory(),
            'brand_id' => Brand::factory(),
            'unit_id' => Unit::factory(),
            'avg_cost' => fake()->randomFloat(2, 50, 500),
            'selling_price' => fake()->randomFloat(2, 100, 1000),
            'current_stock' => 0,
            'minimum_stock_level' => 5,
            'manage_stock' => true,
            'is_for_sale' => true,
            'is_active' => true,
            'warranty_period_months' => null,
            'has_installation_service' => false,
            'emi_available' => false,
            'track_serial_number' => false,
        ];
    }
}
