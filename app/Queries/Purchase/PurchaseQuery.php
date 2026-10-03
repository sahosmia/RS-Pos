<?php

namespace App\Queries\Purchase;

use App\Models\Purchase;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class PurchaseQuery
{
    /**
     * Shared by the Purchases list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{search?: ?string, from?: ?string, to?: ?string, supplier_id?: ?int, status?: ?string, payment_status?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<Purchase>
     */
    public static function filtered(array $filters, User $user): Builder
    {
        if ($user->can('purchase.view_all')) {
            $query = Purchase::query();
        } elseif ($user->can('purchase.view_own')) {
            $query = Purchase::where('created_by', $user->id);
        } else {
            abort(403);
        }

        $sort = $filters['sort'] ?? 'purchase_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['invoice_no', 'purchase_date', 'total_amount', 'due_amount', 'payment_status', 'status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'purchase_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return $query
            ->with(['supplier:id,name', 'creator:id,name'])
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(function (Builder $q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn (Builder $q) => $q->where('name', 'like', "%{$search}%"));
            }))
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('purchase_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('purchase_date', '<=', $to))
            ->when($filters['supplier_id'] ?? null, fn (Builder $q, int $id) => $q->where('supplier_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, string $status) => $q->where('payment_status', $status))
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
