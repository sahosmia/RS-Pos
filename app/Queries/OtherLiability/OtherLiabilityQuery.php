<?php

namespace App\Queries\OtherLiability;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\OtherLiability;
use Illuminate\Database\Eloquent\Builder;

class OtherLiabilityQuery
{
    /**
     * Shared by the Other Liabilities list page and its export endpoint so
     * the two never drift apart. No filters exist on this list today (see
     * `OtherLiabilityController::index()`'s previous `->get()`) — nothing to
     * accept or apply here beyond the same eager counts/ordering the index
     * always used.
     *
     * @return Builder<OtherLiability>
     */
    public static function filtered(): Builder
    {
        return OtherLiability::query()
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', OtherLiabilityTransactionType::OpeningLiability),
            ])
            ->orderBy('name');
    }
}
