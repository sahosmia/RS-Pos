<?php

namespace Database\Factories;

use App\Enums\MiscTransactionCategoryType;
use App\Models\MiscTransactionCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MiscTransactionCategory>
 */
class MiscTransactionCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'type' => MiscTransactionCategoryType::Expense,
        ];
    }

    public function income(): static
    {
        return $this->state(fn () => ['type' => MiscTransactionCategoryType::Income]);
    }
}
