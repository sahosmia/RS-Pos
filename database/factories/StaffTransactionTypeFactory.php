<?php

namespace Database\Factories;

use App\Enums\BalanceEffect;
use App\Enums\StaffTransactionNature;
use App\Models\StaffTransactionType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StaffTransactionType>
 */
class StaffTransactionTypeFactory extends Factory
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
            'effect_on_balance' => BalanceEffect::Increase,
            'nature' => StaffTransactionNature::Advance,
        ];
    }
}
