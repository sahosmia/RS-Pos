<?php

namespace App\Enums;

/**
 * Optional name prefix, shown in the Contact create/edit modal ahead of
 * First/Middle/Last Name (doc/corrections2.md — Contact modal redesign).
 */
enum ContactPrefix: string
{
    case Mr = 'mr';
    case Mrs = 'mrs';
    case Ms = 'ms';
    case Dr = 'dr';
    case Mx = 'mx';

    public function label(): string
    {
        return match ($this) {
            self::Mr => 'Mr.',
            self::Mrs => 'Mrs.',
            self::Ms => 'Ms.',
            self::Dr => 'Dr.',
            self::Mx => 'Mx.',
        };
    }
}
