<?php

namespace Database\Factories;

use App\Enums\SaleStatus;
use App\Models\Contact;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Contact::factory(),
            'invoice_no' => 'INV-'.fake()->unique()->numerify('####'),
            'sale_date' => fake()->date(),
            'subtotal' => 0,
            'discount_amount' => 0,
            'total_amount' => 0,
            'paid_amount' => 0,
            'due_amount' => 0,
            'payment_status' => 'due',
            'status' => SaleStatus::Draft,
            'source' => 'manual',
            'financing_type' => 'one_time',
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => SaleStatus::Confirmed]);
    }
}
