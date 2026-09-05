<?php

namespace App\Actions\AccountingPeriod;

use App\Enums\AccountingPeriodStatus;
use App\Models\AccountingPeriod;
use Illuminate\Support\Facades\Auth;

class ClosePeriodAction
{
    /**
     * Locks a period so no journal entry can ever be posted (or reversed
     * into) that period again. Idempotent — closing an already-closed
     * period is a safe no-op, not an error.
     */
    public function execute(AccountingPeriod $period): AccountingPeriod
    {
        if ($period->status === AccountingPeriodStatus::Closed) {
            return $period;
        }

        $period->update([
            'status' => AccountingPeriodStatus::Closed,
            'closed_at' => now(),
            'closed_by' => Auth::id(),
        ]);

        return $period;
    }
}
