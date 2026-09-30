<?php

namespace Database\Seeders;

use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use Illuminate\Database\Seeder;

class OtherLiabilitySeeder extends Seeder
{
    public function run(): void
    {
        app(CreateOtherLiabilityAction::class)->execute([
            'name' => 'Old Unpaid Tax 2024',
            'opening_amount' => 0,
        ]);
    }
}
