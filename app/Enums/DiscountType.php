<?php

namespace App\Enums;

/**
 * Invoice-level discount shape — a flat amount, or a percentage of the
 * subtotal.
 */
enum DiscountType: string
{
    case Flat = 'flat';
    case Percentage = 'percentage';
}
