<?php

namespace Database\Factories;

use App\Enums\InvestorTransactionType;
use App\Models\Investor;
use App\Models\InvestorTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvestorTransaction>
 */
class InvestorTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'investor_id' => Investor::factory(),
            'type' => InvestorTransactionType::Investment,
            'amount' => fake()->randomFloat(2, 10000, 200000),
        ];
    }
}
