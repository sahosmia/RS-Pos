<?php

namespace Database\Seeders;

use App\Models\OtherIncomeCategory;
use Illuminate\Database\Seeder;

class OtherIncomeCategorySeeder extends Seeder
{
    /**
     * Everyday small-income categories — shop owners add their own from the Other Income page.
     */
    public function run(): void
    {
        foreach (['Scrap / Carton Sale', 'Interest', 'Commission', 'Miscellaneous'] as $name) {
            OtherIncomeCategory::query()->firstOrCreate(['name' => $name]);
        }
    }
}
