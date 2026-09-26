<?php

namespace App\Enums;

/**
 * Every kind of alert the daily `notifications:generate` job (and the EMI
 * overdue job, which extends `DuePayment`) can raise for the shop owner.
 */
enum NotificationType: string
{
    case LowStock = 'low_stock';
    case DuePayment = 'due_payment';
    case LoanRepayment = 'loan_repayment';
    case ExpenseDue = 'expense_due';
}
