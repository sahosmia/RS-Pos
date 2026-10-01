<?php

namespace App\Enums;

/**
 * Which General Ledger shape a staff_transaction_types row posts — since
 * types are an admin-manageable lookup (mirroring Account Type's
 * flexibility), the journal can't switch on a type's name, so every type
 * (default or custom) declares one of these instead of
 * AddStaffTransactionAction hardcoding per-type-name behavior.
 *
 * `Expense` (Salary Charge) — Dr Salary expense / Cr Staff Payable (2250), no cash.
 * `Settlement` (Salary Payment) — Dr Staff Payable (2250) / Cr {account}, cash out.
 * `Advance` (Advance/Loan Given) — Dr Staff Advances (1300) / Cr {account}, cash out.
 * `AdvanceReturn` (Advance Return) — Dr {account} / Cr Staff Advances (1300), cash in — the reverse of `Advance`.
 * `Salary` — Dr Salary expense (5210) / Cr {account}, cash out in one step; never touches the staff balance.
 * `Adjustment` — a situational correction against Opening Balance Equity (3300).
 */
enum StaffTransactionNature: string
{
    case Expense = 'expense';
    case Settlement = 'settlement';
    case Advance = 'advance';
    case AdvanceReturn = 'advance_return';
    case Adjustment = 'adjustment';
    case Salary = 'salary';
}
