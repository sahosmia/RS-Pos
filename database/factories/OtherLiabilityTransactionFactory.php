<?php

namespace Database\Factories;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\OtherLiability;
use App\Models\OtherLiabilityTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OtherLiabilityTransaction>
 */
class OtherLiabilityTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'other_liability_id' => OtherLiability::factory(),
            'type' => OtherLiabilityTransactionType::OpeningLiability,
            'amount' => fake()->randomFloat(2, 1000, 20000),
        ];
    }
}
