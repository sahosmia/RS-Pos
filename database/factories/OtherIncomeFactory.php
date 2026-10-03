<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\OtherIncome;
use App\Models\OtherIncomeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OtherIncome>
 */
class OtherIncomeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'other_income_category_id' => OtherIncomeCategory::factory(),
            'account_id' => Account::factory(),
            'amount' => fake()->randomFloat(2, 50, 2000),
            'income_date' => today(),
            'note' => null,
        ];
    }
}
