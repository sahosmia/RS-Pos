<?php

namespace Database\Factories;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use App\Models\AssetTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssetTransaction>
 */
class AssetTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'asset_id' => Asset::factory(),
            'type' => AssetTransactionType::OpeningAsset,
            'amount' => fake()->randomFloat(2, 1000, 50000),
        ];
    }
}
