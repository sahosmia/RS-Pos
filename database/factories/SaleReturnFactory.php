<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Sale;
use App\Models\SaleReturn;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaleReturn>
 */
class SaleReturnFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory()->confirmed(),
            'customer_id' => Contact::factory(),
            'return_date' => fake()->date(),
            'total_amount' => 0,
            'reason' => null,
        ];
    }
}
