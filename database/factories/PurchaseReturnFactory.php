<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseReturn>
 */
class PurchaseReturnFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'purchase_id' => Purchase::factory()->received(),
            'supplier_id' => Contact::factory()->supplier(),
            'return_date' => fake()->date(),
            'total_amount' => 0,
            'reason' => null,
        ];
    }
}
