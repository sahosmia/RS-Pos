<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const NAMES = ['Air Conditioner Inverter', 'Refrigerator', 'Washing Machine Front Loading', 'Television', 'Geyser', 'Water Kettle', 'Mixer Grinder', 'Microwave Oven Solo', 'Microwave Oven with Convection', 'Freezer', 'Air Conditioner Non Inverter', 'Washing Machine Top Loading', 'Air Cooler', 'Air Circulator Fan', 'Copper Pipe', 'Gas', 'Water Purifier', 'Parts', 'Microwave Oven Solo With Grill'];

    public function run(): void
    {
        foreach (self::NAMES as $name) {
            Category::query()->firstOrCreate(['name' => $name]);
        }
    }
}
