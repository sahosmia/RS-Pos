<?php

namespace Database\Factories;

use App\Enums\ContactEntityType;
use App\Enums\ContactType;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '+8801'.fake()->numerify('#########'),
            'email' => fake()->unique()->safeEmail(),
            'address' => fake()->address(),
            'shipping_address' => null,
            'type' => ContactType::Customer,
            'entity_type' => ContactEntityType::Individual,
            'business_name' => null,
            'customer_group_id' => null,
            'balance' => 0,
            'is_active' => true,
        ];
    }

    public function supplier(): static
    {
        return $this->state(['type' => ContactType::Supplier]);
    }

    public function both(): static
    {
        return $this->state(['type' => ContactType::Both]);
    }
}
