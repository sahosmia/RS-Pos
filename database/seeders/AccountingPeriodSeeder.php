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
        // The periods follow the shop's fiscal-year start month, which lives in Settings (find-or-create — never overwrites yours).
        $this->call(SettingsSeeder::class);

        $startMonth = Settings::current()->fiscal_year_start_month;
        $today = Carbon::today();

        $fiscalYearStart = $today->month >= $startMonth
            ? Carbon::create($today->year, $startMonth, 1)
            : Carbon::create($today->year - 1, $startMonth, 1);

        for ($i = 0; $i < 12; $i++) {
            $start = $fiscalYearStart->copy()->addMonths($i)->startOfMonth();
            $end = $start->copy()->endOfMonth();

            // `whereDate`, not an equality match: on SQLite the date cast stores "2026-07-01 00:00:00", so a plain
            // lookup would miss the existing row on a second run and trip the unique (start_date, end_date) key.
            $exists = AccountingPeriod::query()
                ->whereDate('start_date', $start->toDateString())
                ->whereDate('end_date', $end->toDateString())
                ->exists();

            if (! $exists) {
                AccountingPeriod::query()->create([
                    'start_date' => $start->toDateString(),
                    'end_date' => $end->toDateString(),
                    'status' => 'open',
                ]);
            }
        }
    }
}
