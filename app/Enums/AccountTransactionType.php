<?php

namespace App\Enums;

/**
 * Every way money can move in or out of an Account.
 *
 * Kept as the single reference list for `account_transactions.type`; new
 * modules add their own case here rather than inventing a raw string.
 */
enum AccountTransactionType: string
{
    case OpeningBalance = 'opening_balance';
    case SalePayment = 'sale_payment';
    case PurchasePayment = 'purchase_payment';
    case SaleReturnRefund = 'sale_return_refund';
    case PurchaseReturnRefund = 'purchase_return_refund';
    case Expense = 'expense';
    case Adjustment = 'adjustment';
    case TransferIn = 'transfer_in';
    case TransferOut = 'transfer_out';
    case LoanReceived = 'loan_received';
    case LoanRepayment = 'loan_repayment';
    case AssetPurchase = 'asset_purchase';
    case AssetSale = 'asset_sale';
    case InvestmentReceived = 'investment_received';
    case ProfitDistribution = 'profit_distribution';
    case InvestorWithdrawal = 'investor_withdrawal';
    case SalesOrderAdvance = 'sales_order_advance';
    case ServiceCharge = 'service_charge';
    case StaffSalaryPayment = 'staff_salary_payment';
    case StaffAdvance = 'staff_advance';
    case StaffLoan = 'staff_loan';
    case EmiPayment = 'emi_payment';
}
