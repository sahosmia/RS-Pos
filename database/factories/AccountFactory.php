<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AccountType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Account>
 */
class AccountFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company().' Account',
            'account_type_id' => AccountType::factory(),
            'account_sub_type' => null,
            'account_number' => null,
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_active' => true,
        ];
    }
}
