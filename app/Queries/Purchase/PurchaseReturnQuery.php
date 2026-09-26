<?php

namespace App\Queries\Purchase;

use App\Models\PurchaseReturn;
use Illuminate\Database\Eloquent\Builder;

class PurchaseReturnQuery
{
    /**
     * Shared by the Purchase Returns list page and its export endpoint so
     * the two never drift apart — an export must return exactly the rows
     * the list page shows for the same filters. `PurchaseReturnController`
     * never row-scoped by `created_by` the way `PurchaseQuery` does for
     * Purchases, so this doesn't either — only the date-range filter
     * carries over.
     *
     * @param  array{from?: ?string, to?: ?string}  $filters
     * @return Builder<PurchaseReturn>
     */
    public static function filtered(array $filters): Builder
    {
        return PurchaseReturn::query()
            ->with('supplier:id,name', 'purchase:id,invoice_no')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('return_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('return_date', '<=', $to))
            ->orderByDesc('return_date')
            ->orderByDesc('id');
    }
}
