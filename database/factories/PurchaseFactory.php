<?php

namespace Database\Factories;

use App\Enums\PurchaseStatus;
use App\Models\Contact;
use App\Models\Purchase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Purchase>
 */
class PurchaseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Contact::factory()->supplier(),
            'invoice_no' => 'PUR-'.fake()->unique()->numerify('####'),
            'purchase_date' => fake()->date(),
            'total_amount' => 0,
            'paid_amount' => 0,
            'due_amount' => 0,
            'payment_status' => 'due',
            'status' => PurchaseStatus::Draft,
        ];
    }

    public function received(): static
    {
        return $this->state(['status' => PurchaseStatus::Received]);
    }
}
