<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single-row header holding the petty cash balance.
 *
 * Deliberately standalone: it never touches `accounts`/`account_transactions`
 * and is excluded from Balance Sheet / Financial Position reporting.
 */
class CashBook extends Model
{
    protected $table = 'cash_book';

    /**
     * `current_balance` only moves alongside a cash_book_entries row.
     *
     * @var list<string>
     */
    protected $fillable = [];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_balance' => 'float',
        ];
    }

    /**
     * Get the single cash book row.
     */
    public static function current(): self
    {
        return static::query()->firstOrFail();
    }
}
