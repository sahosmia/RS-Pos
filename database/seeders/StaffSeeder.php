<?php

namespace Database\Seeders;

use App\Models\Investor;
use App\Models\Staff;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $rafiqulInvestor = Investor::query()->where('name', 'Rafiqul Islam')->first();

        Staff::firstOrCreate([
            'name' => 'Rafiqul Islam',
        ], [
            'designation' => 'Sales Executive',
            'joining_date' => Carbon::today()->toDateString(),
            'salary_amount' => 18000,
            'investor_id' => $rafiqulInvestor?->id,
        ]);

        Staff::firstOrCreate([
            'name' => 'Nasrin Akter',
        ], [
            'designation' => 'Cashier',
            'joining_date' => Carbon::today()->toDateString(),
            'salary_amount' => 15000,
        ]);
    }
}
