<?php

namespace App\Enums;

use Illuminate\Support\Carbon;

/**
 * The Dashboard's date-range filter presets (doc/corrections2.md #4).
 * `Custom` is a marker only — the controller resolves it from the
 * request's own `from`/`to` instead of calling {@see resolve()}.
 *
 * "This Month"/"This Year" are month-to-date/year-to-date (end capped at
 * today) since there's no data for days that haven't happened yet; "Last …"
 * presets are always the full prior period.
 */
enum DateRangePreset: string
{
    case Today = 'today';
    case Yesterday = 'yesterday';
    case Last7Days = 'last_7_days';
    case Last30Days = 'last_30_days';
    case ThisMonth = 'this_month';
    case LastMonth = 'last_month';
    case ThisMonthLastYear = 'this_month_last_year';
    case ThisYear = 'this_year';
    case LastYear = 'last_year';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Today => 'Today',
            self::Yesterday => 'Yesterday',
            self::Last7Days => 'Last 7 Days',
            self::Last30Days => 'Last 30 Days',
            self::ThisMonth => 'This Month',
            self::LastMonth => 'Last Month',
            self::ThisMonthLastYear => 'This Month Last Year',
            self::ThisYear => 'This Year',
            self::LastYear => 'Last Year',
            self::Custom => 'Custom Range',
        };
    }

    /**
     * @return array{start: Carbon, end: Carbon}
     */
    public function resolve(): array
    {
        $today = Carbon::today();

        return match ($this) {
            self::Today => ['start' => $today->copy(), 'end' => $today->copy()],
            self::Yesterday => ['start' => $today->copy()->subDay(), 'end' => $today->copy()->subDay()],
            self::Last7Days => ['start' => $today->copy()->subDays(6), 'end' => $today->copy()],
            self::Last30Days => ['start' => $today->copy()->subDays(29), 'end' => $today->copy()],
            self::ThisMonth => ['start' => $today->copy()->startOfMonth(), 'end' => $today->copy()],
            self::LastMonth => [
                'start' => $today->copy()->subMonthNoOverflow()->startOfMonth(),
                'end' => $today->copy()->subMonthNoOverflow()->endOfMonth(),
            ],
            self::ThisMonthLastYear => [
                'start' => $today->copy()->subYearNoOverflow()->startOfMonth(),
                'end' => $today->copy()->subYearNoOverflow()->endOfMonth(),
            ],
            self::ThisYear => ['start' => $today->copy()->startOfYear(), 'end' => $today->copy()],
            self::LastYear => ['start' => $today->copy()->subYear()->startOfYear(), 'end' => $today->copy()->subYear()->endOfYear()],
            self::Custom => ['start' => $today->copy(), 'end' => $today->copy()],
        };
    }
}
