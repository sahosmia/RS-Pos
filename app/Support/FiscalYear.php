<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * The fiscal year "containing" a date runs from `fiscal_year_start_month`
 * of one calendar year through the day before that same month the next
 * year (Bangladesh convention default: July–June, পর্ব ১৪). Reports that
 * default to "this fiscal year" (P&L, Cash Flow, Trending Products) use
 * this as their starting range — an explicit `from`/`to` query param
 * always overrides it.
 */
class FiscalYear
{
    /**
     * @return array{start: Carbon, end: Carbon}
     */
    public static function containing(Carbon $date, int $startMonth): array
    {
        $start = $date->copy()->startOfMonth();

        if ($date->month < $startMonth) {
            $start = $start->subYear();
        }

        $start = $start->month($startMonth)->startOfMonth();

        return [
            'start' => $start,
            'end' => $start->copy()->addYear()->subDay()->endOfDay(),
        ];
    }

    /**
     * @return array{start: Carbon, end: Carbon}
     */
    public static function current(int $startMonth): array
    {
        return self::containing(Carbon::today(), $startMonth);
    }
}
