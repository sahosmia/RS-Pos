<?php

namespace App\Enums;

/**
 * `investment` (new capital in, total_invested grows) · `profit_share`
 * (cash paid out, total_invested untouched) · `withdrawal` (capital pulled
 * out, total_invested shrinks) · `adjustment` (correction, situational).
 */
enum InvestorTransactionType: string
{
    case Investment = 'investment';
    case ProfitShare = 'profit_share';
    case Withdrawal = 'withdrawal';
    case Adjustment = 'adjustment';
}
