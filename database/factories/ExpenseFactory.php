<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'expense_category_id' => ExpenseCategory::factory(),
            'contact_id' => null,
            'total_amount' => fake()->randomFloat(2, 100, 5000),
            'paid_amount' => 0,
            'due_amount' => 0,
            'payment_status' => 'due',
            'expense_date' => fake()->date(),
            'note' => null,
        ];
    }
}
