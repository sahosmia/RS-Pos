<?php

namespace App\Enums;

enum CashBookEntryType: string
{
    case OpeningBalance = 'opening_balance';
    case Income = 'income';
    case Expense = 'expense';

    public function signedAmount(float $amount): float
    {
        return $this === self::Expense ? -$amount : $amount;
    }
}
