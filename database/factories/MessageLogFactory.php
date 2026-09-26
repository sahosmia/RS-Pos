<?php

namespace Database\Factories;

use App\Enums\MessageChannel;
use App\Enums\MessageStatus;
use App\Models\Contact;
use App\Models\MessageLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MessageLog>
 */
class MessageLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'channel' => fake()->randomElement(MessageChannel::cases()),
            'subject' => null,
            'message' => fake()->sentence(),
            'status' => MessageStatus::Pending,
            'reference_type' => null,
            'reference_id' => null,
            'attachment_type' => null,
            'attachment_path' => null,
            'sent_at' => null,
            'created_by' => null,
        ];
    }
}
