<?php

namespace App\Queries\Sale;

use App\Models\SaleReturn;
use Illuminate\Database\Eloquent\Builder;

class SaleReturnQuery
{
    /**
     * Shared by the Sale Returns list page and its export endpoint so the
     * two never drift apart — an export must return exactly the rows the
     * list page shows for the same filters. `SaleReturnController` never
     * row-scoped by `created_by` the way `SaleQuery` does for Sales, so this
     * doesn't either — only the date-range filter carries over.
     *
     * @param  array{from?: ?string, to?: ?string}  $filters
     * @return Builder<SaleReturn>
     */
    public static function filtered(array $filters): Builder
    {
        return SaleReturn::query()
            ->with('customer:id,name', 'sale:id,invoice_no')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('return_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('return_date', '<=', $to))
            ->orderByDesc('return_date')
            ->orderByDesc('id');
    }
}
