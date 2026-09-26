<?php

namespace App\Enums;

/**
 * Shared by `message_logs.channel` and `campaigns.channel` — whichever
 * channel the sender picks at send time (per-contact availability is
 * checked at the UI layer, e.g. Email disabled if contacts.email is empty).
 */
enum MessageChannel: string
{
    case Sms = 'sms';
    case Whatsapp = 'whatsapp';
    case Email = 'email';
}
