<?php

namespace Database\Factories;

use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseCategory>
 */
class ExpenseCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'chart_of_account_id' => ChartOfAccount::factory()->state([
                'type' => ChartOfAccountType::Expense,
                'normal_balance' => NormalBalance::Debit,
            ]),
        ];
    }
}
