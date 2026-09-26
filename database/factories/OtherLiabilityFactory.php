<?php

namespace Database\Factories;

use App\Models\OtherLiability;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OtherLiability>
 */
class OtherLiabilityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'opening_amount' => 0,
            'current_balance' => 0,
        ];
    }
}
