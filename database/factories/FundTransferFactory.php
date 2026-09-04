<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\FundTransfer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FundTransfer>
 */
class FundTransferFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'from_account_id' => Account::factory(),
            'to_account_id' => Account::factory(),
            'amount' => fake()->randomFloat(2, 100, 10000),
            'transfer_date' => today(),
        ];
    }
}
