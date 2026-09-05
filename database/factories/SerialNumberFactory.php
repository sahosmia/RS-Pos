<?php

namespace Database\Factories;

use App\Enums\SerialNumberStatus;
use App\Models\Product;
use App\Models\SerialNumber;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SerialNumber>
 */
class SerialNumberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'serial_number' => fake()->unique()->bothify('SN-########'),
            'status' => SerialNumberStatus::InStock,
            'purchase_item_id' => null,
            'sale_item_id' => null,
        ];
    }
}
