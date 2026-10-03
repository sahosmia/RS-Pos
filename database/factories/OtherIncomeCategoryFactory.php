<?php

namespace Database\Factories;

use App\Models\OtherIncomeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OtherIncomeCategory>
 */
class OtherIncomeCategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
        ];
    }
}
