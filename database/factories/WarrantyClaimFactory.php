<?php

namespace Database\Factories;

use App\Models\SaleItem;
use App\Models\WarrantyClaim;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WarrantyClaim>
 */
class WarrantyClaimFactory extends Factory
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
            'claim_date' => fake()->date(),
            'issue_description' => fake()->sentence(),
            'status' => 'pending',
        ];
    }
}
