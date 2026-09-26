<?php

namespace App\Queries\Sale;

use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Builder;

class SalesOrderQuery
{
    /**
     * Shared by the Sales Order list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{from?: ?string, to?: ?string, customer_id?: ?int, status?: ?string}  $filters
     * @return Builder<SalesOrder>
     */
    public static function filtered(array $filters): Builder
    {
        return SalesOrder::query()
            ->with('customer:id,name')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('order_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('order_date', '<=', $to))
            ->when($filters['customer_id'] ?? null, fn (Builder $q, int $id) => $q->where('customer_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->orderByDesc('order_date')
            ->orderByDesc('id');
    }
}
