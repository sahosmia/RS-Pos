<?php

namespace App\Enums;

use Carbon\CarbonImmutable;

enum EmiFrequency: string
{
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';

    public function perYear(): int
    {
        return match ($this) {
            self::Weekly => 52,
            self::Monthly => 12,
            self::Quarterly => 4,
        };
    }

    /**
     * The k-th due date, always counted from the anchor (not from the previous due date) so a 31st
     * doesn't slide to the 28th for good after one short month.
     */
    public function dueDate(CarbonImmutable $anchor, int $k): CarbonImmutable
    {
        return match ($this) {
            self::Weekly => $anchor->addWeeks($k),
            self::Monthly => $anchor->addMonthsNoOverflow($k),
            self::Quarterly => $anchor->addMonthsNoOverflow(3 * $k),
        };
    }
}
