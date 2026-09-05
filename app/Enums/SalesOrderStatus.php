<?php

namespace App\Enums;

/**
 * `pending` (no advance taken yet) · `partial` (advance received, not yet
 * fulfilled) · `completed` (converted into a real Sale) · `cancelled`.
 */
enum SalesOrderStatus: string
{
    case Pending = 'pending';
    case Partial = 'partial';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
