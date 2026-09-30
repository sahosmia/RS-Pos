<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Walton', 'Samsung', 'LG', 'Vision', 'Singer'];

        foreach ($names as $name) {
            Brand::query()->firstOrCreate(
                ['name' => $name],
                ['description' => "Official {$name} brand products"]
            );
        }
    }
}
