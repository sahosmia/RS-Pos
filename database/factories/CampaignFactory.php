<?php

namespace Database\Factories;

use App\Enums\CampaignStatus;
use App\Enums\CampaignTargetType;
use App\Enums\MessageChannel;
use App\Models\Campaign;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'message' => fake()->sentence(),
            'channel' => fake()->randomElement(MessageChannel::cases()),
            'target_type' => CampaignTargetType::CustomSelection,
            'target_group_id' => null,
            'status' => CampaignStatus::Draft,
            'created_by' => null,
        ];
    }
}
