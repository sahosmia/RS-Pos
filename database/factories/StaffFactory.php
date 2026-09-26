<?php

namespace Database\Factories;

use App\Enums\StaffStatus;
use App\Models\Staff;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Staff>
 */
class StaffFactory extends Factory
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
            'designation' => fake()->jobTitle(),
            'joining_date' => fake()->date(),
            'salary_amount' => fake()->randomFloat(2, 8000, 40000),
            'status' => StaffStatus::Active,
            'balance' => 0,
        ];
    }
}
