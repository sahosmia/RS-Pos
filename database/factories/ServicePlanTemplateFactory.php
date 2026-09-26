<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ServicePlanTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServicePlanTemplate>
 */
class ServicePlanTemplateFactory extends Factory
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
            'period_number' => 1,
            'period_months' => 12,
            'free_quota' => 2,
        ];
    }
}
