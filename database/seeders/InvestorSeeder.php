<?php

namespace Database\Seeders;

use App\Models\Investor;
use Illuminate\Database\Seeder;

class InvestorSeeder extends Seeder
{
    public function run(): void
    {
        Investor::query()->firstOrCreate(
            ['name' => 'Abdul Malek'],
            ['phone' => '01711111111', 'note' => 'Primary partner']
        );

        Investor::query()->firstOrCreate(
            ['name' => 'Rafiqul Islam'],
            ['phone' => '01722222222', 'note' => 'Working partner & Sales Executive']
        );
    }
}
