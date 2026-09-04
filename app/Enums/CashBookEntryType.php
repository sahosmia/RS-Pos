<?php

namespace App\Enums;

enum CashBookEntryType: string
{
    case OpeningBalance = 'opening_balance';
    case Income = 'income';
    case Expense = 'expense';

    /**
     * Signed effect this entry type has on the cash book balance.
     */
    public function signedAmount(float $amount): float
    {
        return $this === self::Expense ? -$amount : $amount;
    }
}
