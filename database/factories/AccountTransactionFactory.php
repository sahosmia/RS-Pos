<?php

namespace Database\Factories;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\AccountTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccountTransaction>
 */
class AccountTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'type' => AccountTransactionType::Adjustment,
            'amount' => fake()->randomFloat(2, 100, 10000),
            'operation_date' => today(),
        ];
    }
}
