<?php

namespace App\Enums;

/**
 * Shared by `message_logs.status` and `campaign_recipients.status` — same
 * delivery-outcome meaning in both, mirroring how PaymentStatus is reused
 * across sales/purchases/expenses.
 */
enum MessageStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';
}
