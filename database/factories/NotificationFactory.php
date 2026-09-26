<?php

namespace Database\Factories;

use App\Enums\NotificationType;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(NotificationType::cases()),
            'title' => fake()->sentence(4),
            'message' => fake()->sentence(),
            'reference_type' => null,
            'reference_id' => null,
            'is_read' => false,
        ];
    }
}
