<?php

namespace Database\Factories;

use App\Models\SaleItem;
use App\Models\SaleItemServicePeriod;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaleItemServicePeriod>
 */
class SaleItemServicePeriodFactory extends Factory
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
            'period_number' => 1,
            'period_months' => 12,
            'free_quota' => 2,
            'period_start_date' => today(),
            'period_end_date' => today()->addMonths(12),
        ];
    }
}
