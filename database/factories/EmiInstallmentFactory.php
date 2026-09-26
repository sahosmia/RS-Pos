<?php

namespace Database\Factories;

use App\Models\EmiInstallment;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmiInstallment>
 */
class EmiInstallmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory(),
            'installment_number' => 1,
            'due_date' => fake()->date(),
            'amount' => fake()->randomFloat(2, 500, 5000),
            'paid_amount' => 0,
            'status' => 'pending',
        ];
    }
}
