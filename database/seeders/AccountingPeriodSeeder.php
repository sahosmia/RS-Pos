<?php

namespace Database\Seeders;

use App\Models\AccountingPeriod;
use App\Models\Settings;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Twelve monthly periods covering the current fiscal year, aligned to
 * `settings.fiscal_year_start_month` — all seeded Open.
 */
class AccountingPeriodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $startMonth = Settings::current()->fiscal_year_start_month;
        $today = Carbon::today();

        $fiscalYearStart = $today->month >= $startMonth
            ? Carbon::create($today->year, $startMonth, 1)
            : Carbon::create($today->year - 1, $startMonth, 1);

        for ($i = 0; $i < 12; $i++) {
            $start = $fiscalYearStart->copy()->addMonths($i)->startOfMonth();
            $end = $start->copy()->endOfMonth();

            AccountingPeriod::query()->firstOrCreate(
                ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
                ['status' => 'open'],
            );
        }
    }
}
