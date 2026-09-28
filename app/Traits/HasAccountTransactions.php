<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;

trait HasAccountTransactions
{
    /**
     * Sum the absolute account transaction amounts for a given reference.
     */
    protected function sumAccountTransactions(string $referenceType, int $referenceId): float
    {
        return abs((float) DB::table('account_transactions')
            ->where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->sum('amount'));
    }
}
