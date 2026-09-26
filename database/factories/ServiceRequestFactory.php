<?php

namespace Database\Factories;

use App\Enums\ServiceRequestType;
use App\Models\SaleItem;
use App\Models\ServiceRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceRequest>
 */
class ServiceRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sale_item_id' => SaleItem::factory(),
            'request_date' => fake()->date(),
            'type' => ServiceRequestType::Service,
            'is_free' => true,
            'charge_amount' => 0,
        ];
    }
}
