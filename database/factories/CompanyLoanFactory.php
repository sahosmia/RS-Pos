<?php

namespace Database\Factories;

use App\Models\CompanyLoan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyLoan>
 */
class CompanyLoanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lender_name' => fake()->company(),
            'loan_amount' => fake()->randomFloat(2, 50000, 500000),
            'interest_rate' => fake()->randomFloat(2, 5, 15),
            'outstanding_balance' => 0,
            'start_date' => fake()->date(),
        ];
    }
}
