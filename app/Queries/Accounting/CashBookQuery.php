<?php

namespace App\Queries\Accounting;

use App\Models\CashBookEntry;
use Illuminate\Database\Eloquent\Builder;

class CashBookQuery
{
    /**
     * Shared by the Cash Book list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{category_id?: ?int}  $filters
     * @return Builder<CashBookEntry>
     */
    public static function filtered(array $filters): Builder
    {
        return CashBookEntry::query()
            ->with('category:id,name,type')
            ->when($filters['category_id'] ?? null, fn (Builder $q, int $id) => $q->where('category_id', $id))
            ->orderByDesc('entry_date')
            ->orderByDesc('id');
    }
}
