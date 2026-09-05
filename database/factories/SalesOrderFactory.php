<?php

namespace Database\Factories;

use App\Enums\SalesOrderStatus;
use App\Models\Contact;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalesOrder>
 */
class SalesOrderFactory extends Factory
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
            'order_no' => 'SO-'.fake()->unique()->numerify('####'),
            'order_date' => fake()->date(),
            'expected_delivery_date' => null,
            'status' => SalesOrderStatus::Pending,
            'total_amount' => 0,
            'advance_paid' => 0,
        ];
    }
}
