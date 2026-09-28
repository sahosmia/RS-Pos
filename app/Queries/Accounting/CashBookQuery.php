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
     * @param  array{category_id?: ?int, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<CashBookEntry>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'entry_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['entry_date', 'amount', 'type', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'entry_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return CashBookEntry::query()
            ->with('category:id,name,type')
            ->when($filters['category_id'] ?? null, fn (Builder $q, int $id) => $q->where('category_id', $id))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
