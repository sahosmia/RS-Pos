<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const NAMES = ['Coppertech', 'Gree', 'Haier', 'Haiko', 'Hisense', 'Hotpoint', 'Iron Angle', 'Local', 'Midea', 'National', 'Philips', 'Redswiss', 'Refrigerent', 'Sahara', 'Samsung', 'Sanaky', 'Shamim', 'Sharp', 'Super Hot', 'TCL', 'Vision', 'Walton', 'Whirlpool'];

    public function run(): void
    {
        foreach (self::NAMES as $name) {
            Brand::query()->firstOrCreate(['name' => $name]);
        }
    }
}
