<?php

namespace Database\Seeders;

use App\Models\CashBook;
use Illuminate\Database\Seeder;

class CashBookSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CashBook::query()->firstOrCreate([]);
    }
}
