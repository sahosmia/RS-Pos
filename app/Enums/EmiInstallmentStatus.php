<?php

namespace App\Enums;

enum EmiInstallmentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Overdue = 'overdue';

    /**
     * Set by CancelSaleAction on every not-yet-paid installment of a sale
     * that gets cancelled — the schedule is void, but the row (and any
     * payment history on an already-Paid sibling installment) is kept
     * rather than deleted.
     */
    case Cancelled = 'cancelled';
}
