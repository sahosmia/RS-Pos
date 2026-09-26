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
     * @param  array{search?: ?string, from?: ?string, to?: ?string, supplier_id?: ?int, status?: ?string, payment_status?: ?string}  $filters
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

        return $query
            ->with('supplier:id,name')
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $q->where(function (Builder $q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn (Builder $q) => $q->where('name', 'like', "%{$search}%"));
            }))
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('purchase_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('purchase_date', '<=', $to))
            ->when($filters['supplier_id'] ?? null, fn (Builder $q, int $id) => $q->where('supplier_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, string $status) => $q->where('payment_status', $status))
            ->orderByDesc('purchase_date')
            ->orderByDesc('id');
    }
}
