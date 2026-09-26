<?php

namespace App\Queries\Investor;

use App\Models\Investor;
use Illuminate\Database\Eloquent\Builder;

class InvestorQuery
{
    /**
     * Shared by the Investors list page and its export endpoint so the two
     * never drift apart. No filters exist on this list today — this only
     * centralizes the `transactions_count` eager-load and ordering both call
     * sites need, so a future filter has one place to land.
     *
     * @return Builder<Investor>
     */
    public static function filtered(): Builder
    {
        return Investor::query()
            ->withCount('transactions')
            ->orderBy('name');
    }
}
