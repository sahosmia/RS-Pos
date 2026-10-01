<?php

namespace App\Enums;

/**
 * Whether a staff_transaction_types row grows or shrinks `staff.balance`.
 */
enum BalanceEffect: string
{
    case Increase = 'increase';
    case Decrease = 'decrease';
    /** The transaction moves money but never touches the staff member's advance/payable balance (e.g. Salary). */
    case None = 'none';
}
