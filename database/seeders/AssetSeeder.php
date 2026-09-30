<?php

namespace Database\Seeders;

use App\Actions\Asset\CreateAssetAction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AssetSeeder extends Seeder
{
    public function run(): void
    {
        $createAsset = app(CreateAssetAction::class);

        $createAsset->execute([
            'name' => 'Shop Refrigerator',
            'category' => 'Equipment',
            'purchase_date' => Carbon::today()->toDateString(),
            'opening_value' => 0,
        ]);

        $createAsset->execute([
            'name' => 'Delivery Van',
            'category' => 'Vehicle',
            'purchase_date' => Carbon::today()->toDateString(),
            'opening_value' => 0,
        ]);
    }
}
