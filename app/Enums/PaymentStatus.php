<?php

namespace App\Enums;

/**
 * Derived from `paid_amount` vs `total_amount`, never set directly — shared
 * across sales, purchases, and expenses.
 */
enum PaymentStatus: string
{
    case Due = 'due';
    case Partial = 'partial';
    case Paid = 'paid';

    public static function fromAmounts(float $paidAmount, float $totalAmount): self
    {
        return match (true) {
            $paidAmount <= 0 => self::Due,
            $paidAmount >= $totalAmount => self::Paid,
            default => self::Partial,
        };
    }
}
