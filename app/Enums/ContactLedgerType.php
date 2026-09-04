<?php

namespace App\Enums;

/**
 * Every way a contact's cached balance can move.
 *
 * Kept as the single reference list for `contact_ledger.type`, mirroring
 * AccountTransactionType — most of these belong to modules not built yet
 * (Sale/Purchase/Returns/Expense/Sales Order), pre-declared the same way
 * AccountTransactionType pre-declared cases ahead of their modules.
 */
enum ContactLedgerType: string
{
    case OpeningBalance = 'opening_balance';
    case SaleInvoice = 'sale_invoice';
    case PurchaseBill = 'purchase_bill';
    case PaymentReceived = 'payment_received';
    case PaymentMade = 'payment_made';
    case Adjustment = 'adjustment';
    case SaleReturn = 'sale_return';
    case PurchaseReturn = 'purchase_return';
    case DiscountWaived = 'discount_waived';
    case ExpenseDue = 'expense_due';
    case SalesOrderAdvance = 'sales_order_advance';
    case CreditApplied = 'credit_applied';
}
