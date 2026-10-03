<?php

namespace Database\Seeders;

use App\Actions\OtherIncome\CreateOtherIncomeAction;
use App\Models\OtherIncome;
use App\Models\OtherIncomeCategory;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * A couple of demo small-income entries (cartons sold, bank interest), received into Cash in Hand
 * and the bank. Seeds once: skipped if they already exist.
 */
class OtherIncomeSeeder extends Seeder
{
    public function run(): void
    {
        if (OtherIncome::query()->where('note', 'Empty cartons sold')->exists()) {
            $this->command?->warn('Demo other income is already seeded — skipping OtherIncomeSeeder.');

            return;
        }

        $this->call([AccountSeeder::class, OtherIncomeCategorySeeder::class]);

        $accounts = DemoLookup::accounts();
        $categories = OtherIncomeCategory::query()->pluck('id', 'name');
        $create = app(CreateOtherIncomeAction::class);

        $create->execute([
            'other_income_category_id' => $categories['Scrap / Carton Sale'],
            'account_id' => $accounts['cash']->id,
            'amount' => 200,
            'income_date' => Carbon::today()->subDays(2)->toDateString(),
            'note' => 'Empty cartons sold',
        ]);

        $create->execute([
            'other_income_category_id' => $categories['Interest'],
            'account_id' => $accounts['bank']->id,
            'amount' => 350,
            'income_date' => Carbon::today()->subDays(9)->toDateString(),
            'note' => 'Savings account interest',
        ]);
    }
}
