<?php

namespace App\Queries\Sale;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class SaleQuery
{
    /**
     * Shared by the Sales list page and its export endpoint so the two never
     * drift apart — an export must return exactly the rows the list page
     * shows for the same filters.
     *
     * @param  array{search?: ?string, from?: ?string, to?: ?string, customer_id?: ?int, status?: ?string, payment_status?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Sale>
     */
    public static function filtered(array $filters, User $user): Builder
    {
        if ($user->can('sale.view_all')) {
            $query = Sale::query();
        } elseif ($user->can('sale.view_own')) {
            $query = Sale::where('created_by', $user->id);
        } else {
            abort(403);
        }

        $sort = $filters['sort'] ?? 'sale_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['invoice_no', 'sale_date', 'total_amount', 'due_amount', 'payment_status', 'status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'sale_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return $query
            ->with('customer:id,name')
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(function (Builder $q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn (Builder $q) => $q->where('name', 'like', "%{$search}%"));
            }))
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('sale_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('sale_date', '<=', $to))
            ->when($filters['customer_id'] ?? null, fn (Builder $q, int $id) => $q->where('customer_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, string $status) => $q->where('payment_status', $status))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
