<?php

namespace App\Enums;

/**
 * `opening_asset` (pre-existing asset entered into the system, no account
 * movement) · `purchase`/`addition` (value grows, account decreases) ·
 * `sold` (value drops to 0, account increases by the sale price) ·
 * `disposal` (value drops to 0, no recovery — a write-off).
 */
enum AssetTransactionType: string
{
    case OpeningAsset = 'opening_asset';
    case Purchase = 'purchase';
    case Addition = 'addition';
    case Sold = 'sold';
    case Disposal = 'disposal';
    case Adjustment = 'adjustment';
}
