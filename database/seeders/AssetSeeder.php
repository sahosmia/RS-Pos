<?php

namespace Database\Seeders;

use App\Actions\Asset\AddAssetTransactionAction;
use App\Actions\Asset\CreateAssetAction;
use App\Models\Account;
use App\Models\Asset;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo assets — a refrigerator with an addition, a delivery van, and an old
 * rack sold at a gain. Seeds once: skipped if the demo van already exists.
 */
class AssetSeeder extends Seeder
{
    public function run(): void
    {
        if (Asset::query()->where('name', 'Delivery Van')->exists()) {
            $this->command?->warn('Demo assets are already seeded — skipping AssetSeeder.');

            return;
        }

        $this->call(AccountSeeder::class);

        $this->seedAssets(DemoLookup::accounts());
    }

    /**
     * @param  array<string, Account>  $accounts
     */
    private function seedAssets(array $accounts): void
    {
        $createAsset = app(CreateAssetAction::class);
        $addTransaction = app(AddAssetTransactionAction::class);

        // Shop Refrigerator — opening value, then an addition (AC installed).
        $fridge = $createAsset->execute([
            'name' => 'Shop Refrigerator',
            'category' => 'Equipment',
            'purchase_date' => Carbon::today()->subYear()->toDateString(),
            'opening_value' => 15000,
        ]);
        $addTransaction->execute($fridge, ['type' => 'addition', 'amount' => 3000, 'account_id' => $accounts['cash']->id, 'note' => 'Installed a small AC unit']);

        // Delivery Van — opening value only, still in use.
        $createAsset->execute([
            'name' => 'Delivery Van',
            'category' => 'Vehicle',
            'purchase_date' => Carbon::today()->subYears(2)->toDateString(),
            'opening_value' => 500000,
        ]);

        // Old Display Rack — sold at a gain over its book value.
        $rack = $createAsset->execute([
            'name' => 'Old Display Rack',
            'category' => 'Furniture',
            'purchase_date' => Carbon::today()->subYears(3)->toDateString(),
            'opening_value' => 5000,
        ]);
        $addTransaction->execute($rack->fresh(), ['type' => 'sold', 'sale_price' => 6000, 'account_id' => $accounts['cash']->id, 'note' => 'Replaced with a new rack']);
    }
}
