<?php

namespace App\Enums;

/**
 * `imported` (bulk import, or the manual "Historical record" checkbox) rows
 * are record-only — no stock movement, ledger entry, or account
 * transaction — to avoid double-counting against Opening Stock.
 */
enum SaleSource: string
{
    case Manual = 'manual';
    case Imported = 'imported';
}
