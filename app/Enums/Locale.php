<?php

namespace App\Enums;

/**
 * Per-user UI language (erp-design-decisions.md Phase 33 §4) — a setting on
 * the user, not the shop, so an English-comfortable owner and a
 * Bangla-preferring cashier can each pick their own.
 */
enum Locale: string
{
    case En = 'en';
    case Bn = 'bn';
}
