<?php

namespace Database\Seeders;

use App\Enums\MiscTransactionCategoryType;
use App\Models\MiscTransactionCategory;
use Illuminate\Database\Seeder;

class MiscTransactionCategorySeeder extends Seeder
{
    /**
     * Everyday petty cash categories for the standalone cash book.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Conveyance', 'type' => MiscTransactionCategoryType::Expense],
            ['name' => 'Lunch/Nasta', 'type' => MiscTransactionCategoryType::Expense],
            ['name' => 'Tips', 'type' => MiscTransactionCategoryType::Expense],
            ['name' => 'Extra Income', 'type' => MiscTransactionCategoryType::Income],
        ];

        foreach ($categories as $category) {
            MiscTransactionCategory::query()->firstOrCreate(
                ['name' => $category['name']],
                ['type' => $category['type']],
            );
        }
    }
}
