<?php

namespace App\Enums;

/**
 * `draft` (incomplete) · `quotation` (price offer, carries `valid_until`) ·
 * `confirmed` (stock actually decreases here) · `cancelled`.
 */
enum SaleStatus: string
{
    case Draft = 'draft';
    case Quotation = 'quotation';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
}
