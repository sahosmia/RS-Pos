<?php

namespace App\Queries\Sale;

use App\Models\SaleReturn;
use Illuminate\Database\Eloquent\Builder;

class SaleReturnQuery
{
    /**
     * Shared by the Sale Returns list page and its export endpoint so the
     * two never drift apart — an export must return exactly the rows the
     * list page shows for the same filters.
     *
     * @param  array{from?: ?string, to?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<SaleReturn>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'return_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['return_no', 'return_date', 'total_amount', 'refund_status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'return_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return SaleReturn::query()
            ->with('customer:id,name', 'sale:id,invoice_no')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('return_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('return_date', '<=', $to))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
