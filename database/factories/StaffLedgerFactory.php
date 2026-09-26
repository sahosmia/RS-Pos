<?php

namespace Database\Factories;

use App\Models\Staff;
use App\Models\StaffLedger;
use App\Models\StaffTransactionType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StaffLedger>
 */
class StaffLedgerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'staff_id' => Staff::factory(),
            'staff_transaction_type_id' => StaffTransactionType::factory(),
            'amount' => fake()->randomFloat(2, 500, 20000),
        ];
    }
}
