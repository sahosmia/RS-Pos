<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Air Conditioner',
            'Refrigerator',
            'Television',
            'Washing Machine',
            'Kitchen Appliance',
            'Fan',
        ];

        foreach ($names as $name) {
            Category::query()->firstOrCreate(
                ['name' => $name],
                ['description' => "Category for {$name}"]
            );
        }
    }
}
