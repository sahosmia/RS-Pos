<?php

namespace App\Enums;

/**
 * `draft` → `ordered` (sent to supplier, goods not yet arrived) → `received`
 * (stock actually increases here) → or `cancelled`.
 */
enum PurchaseStatus: string
{
    case Draft = 'draft';
    case Ordered = 'ordered';
    case Received = 'received';
    case Cancelled = 'cancelled';
}
