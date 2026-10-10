<?php

namespace App\Queries\Sale;

use App\Enums\SalesOrderStatus;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Builder;

class SalesOrderQuery
{
    /**
     * Shared by the Sales Order list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{from?: ?string, to?: ?string, customer_id?: ?int, status?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<SalesOrder>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'order_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['order_no', 'order_date', 'total_amount', 'advance_amount', 'status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'order_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return SalesOrder::query()
            ->with(['customer:id,name', 'creator:id,name'])
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('order_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('order_date', '<=', $to))
            ->when($filters['customer_id'] ?? null, fn (Builder $q, int $id) => $q->where('customer_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => match ($status) {
                'all' => $q,
                'open' => $q->whereIn('status', [SalesOrderStatus::Pending, SalesOrderStatus::Partial]),
                default => $q->where('status', $status),
            })
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
