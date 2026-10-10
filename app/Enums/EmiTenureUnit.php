<?php

namespace App\Enums;

enum EmiTenureUnit: string
{
    case Days = 'days';
    case Weeks = 'weeks';
    case Months = 'months';
    case Years = 'years';

    /** How many years `$value` of this unit is (approximate for days: 365-day year). */
    public function toYears(int $value): float
    {
        return match ($this) {
            self::Days => $value / 365,
            self::Weeks => $value / 52,
            self::Months => $value / 12,
            self::Years => (float) $value,
        };
    }
}
