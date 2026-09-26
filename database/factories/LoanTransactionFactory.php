<?php

namespace Database\Factories;

use App\Enums\LoanTransactionType;
use App\Models\CompanyLoan;
use App\Models\LoanTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LoanTransaction>
 */
class LoanTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_loan_id' => CompanyLoan::factory(),
            'type' => LoanTransactionType::Disbursement,
            'amount' => fake()->randomFloat(2, 10000, 100000),
        ];
    }
}
