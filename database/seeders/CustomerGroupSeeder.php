<?php

namespace Database\Seeders;

use App\Models\CustomerGroup;
use Illuminate\Database\Seeder;

class CustomerGroupSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const NAMES = ['Regular', 'Wholesale', 'VIP'];

    public function run(): void
    {
        foreach (self::NAMES as $name) {
            CustomerGroup::query()->firstOrCreate(['name' => $name]);
        }
    }
}
