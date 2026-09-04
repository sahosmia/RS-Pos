<?php

namespace Database\Factories;

use App\Models\SaleItem;
use App\Models\SaleItemSerial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaleItemSerial>
 */
class SaleItemSerialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sale_item_id' => SaleItem::factory(),
            'serial_number' => strtoupper(fake()->bothify('SN-########')),
        ];
    }
}
