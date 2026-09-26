<?php

namespace App\Enums;

/**
 * Whether a staff_transaction_types row grows or shrinks `staff.balance`.
 */
enum BalanceEffect: string
{
    case Increase = 'increase';
    case Decrease = 'decrease';
}
