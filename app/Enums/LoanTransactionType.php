<?php

namespace App\Enums;

/**
 * `opening_loan` (existing debt entered at creation, no account movement) · `disbursement` (new loan received, liability grows) · `repayment` (liability
 * shrinks) · `interest_charge` (liability grows, no account movement — pure
 * accrual) · `adjustment` (correction, situational).
 */
enum LoanTransactionType: string
{
    case OpeningLoan = 'opening_loan';
    case Disbursement = 'disbursement';
    case Repayment = 'repayment';
    case InterestCharge = 'interest_charge';
    case Adjustment = 'adjustment';
}
