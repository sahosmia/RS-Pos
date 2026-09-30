<?php

namespace Database\Seeders;

use App\Models\CustomerGroup;
use Illuminate\Database\Seeder;

class CustomerGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = ['Regular', 'Wholesale', 'VIP'];

        foreach ($groups as $name) {
            CustomerGroup::query()->firstOrCreate(['name' => $name]);
        }
    }
}
