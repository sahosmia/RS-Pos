<?php

namespace App\Enums;

/**
 * `opening_liability` (pre-existing debt entered into the system, no
 * account movement) · `increase` (new debt taken on, account increases if
 * cash was received) · `payment` (settling it, account decreases) ·
 * `adjustment` (correction, situational).
 */
enum OtherLiabilityTransactionType: string
{
    case OpeningLiability = 'opening_liability';
    case Increase = 'increase';
    case Payment = 'payment';
    case Adjustment = 'adjustment';
}
