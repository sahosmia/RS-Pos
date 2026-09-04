<?php

namespace Database\Factories;

use App\Enums\CashBookEntryType;
use App\Models\CashBookEntry;
use App\Models\MiscTransactionCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashBookEntry>
 */
class CashBookEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => CashBookEntryType::Expense,
            'category_id' => MiscTransactionCategory::factory(),
            'amount' => fake()->randomFloat(2, 20, 500),
            'entry_date' => today(),
        ];
    }
}
