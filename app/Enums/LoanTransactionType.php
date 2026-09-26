<?php

namespace App\Enums;

/**
 * `disbursement` (loan received, liability grows) · `repayment` (liability
 * shrinks) · `interest_charge` (liability grows, no account movement — pure
 * accrual) · `adjustment` (correction, situational).
 */
enum LoanTransactionType: string
{
    case Disbursement = 'disbursement';
    case Repayment = 'repayment';
    case InterestCharge = 'interest_charge';
    case Adjustment = 'adjustment';
}
