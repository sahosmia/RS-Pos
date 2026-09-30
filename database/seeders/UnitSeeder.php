<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Piece', 'short_name' => 'pcs', 'description' => 'Individual unit count'],
            ['name' => 'Box', 'short_name' => 'box', 'description' => 'Boxed package'],
            ['name' => 'Set', 'short_name' => 'set', 'description' => 'Complete set'],
            ['name' => 'Kilogram', 'short_name' => 'kg', 'description' => 'Weight in kilograms'],
        ];

        foreach ($units as $unit) {
            Unit::query()->firstOrCreate(['name' => $unit['name']], $unit);
        }
    }
}
