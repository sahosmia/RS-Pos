<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const NAMES = ['Piece', 'Box', 'Set'];

    public function run(): void
    {
        foreach (self::NAMES as $name) {
            Unit::query()->firstOrCreate(['name' => $name]);
        }
    }
}
