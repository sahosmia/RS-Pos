<?php

namespace Database\Seeders;

use App\Actions\Accounting\CashBook\RecordCashBookEntryAction;
use App\Models\CashBookEntry;
use App\Models\MiscTransactionCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo petty-cash entries — an opening balance, one income, three expenses.
 * Seeds once: skipped if the demo entries already exist.
 */
class CashBookEntrySeeder extends Seeder
{
    public function run(): void
    {
        if (CashBookEntry::query()->where('note', 'Scrap sale')->exists()) {
            $this->command?->warn('Demo cash book entries are already seeded — skipping CashBookEntrySeeder.');

            return;
        }

        $this->call([ChartOfAccountSeeder::class, CashBookSeeder::class, MiscTransactionCategorySeeder::class]);

        $recordEntry = app(RecordCashBookEntryAction::class);
        $miscCategories = MiscTransactionCategory::query()->pluck('id', 'name');

        $recordEntry->execute(['type' => 'opening_balance', 'amount' => 5000, 'entry_date' => Carbon::today()->subDays(30)->toDateString()]);
        $recordEntry->execute(['type' => 'income', 'category_id' => $miscCategories['Extra Income'], 'amount' => 800, 'note' => 'Scrap sale', 'entry_date' => Carbon::today()->subDays(6)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Conveyance'], 'amount' => 150, 'entry_date' => Carbon::today()->subDays(4)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Lunch/Nasta'], 'amount' => 350, 'entry_date' => Carbon::today()->subDays(3)->toDateString()]);
        $recordEntry->execute(['type' => 'expense', 'category_id' => $miscCategories['Tips'], 'amount' => 100, 'entry_date' => Carbon::today()->subDay()->toDateString()]);
    }
}
