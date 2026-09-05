<?php

namespace Database\Factories;

use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChartOfAccount>
 */
class ChartOfAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->numerify('9###'),
            'name' => fake()->words(2, true),
            'type' => ChartOfAccountType::Asset,
            'normal_balance' => NormalBalance::Debit,
            'parent_id' => null,
            'is_active' => true,
        ];
    }
}
