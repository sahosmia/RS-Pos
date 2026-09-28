<?php

namespace App\Queries\EmiInstallment;

use App\Models\EmiInstallment;
use Illuminate\Database\Eloquent\Builder;

class EmiInstallmentQuery
{
    /**
     * Shared by the EMI Installments list page and its export endpoint so the
     * two never drift apart.
     *
     * @param  array{status?: ?string, search?: ?string, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<EmiInstallment>
     */
    public static function filtered(array $filters): Builder
    {
        $search = $filters['search'] ?? '';

        $sort = $filters['sort'] ?? 'due_date';
        $direction = $filters['direction'] ?? 'asc';
        $allowedSorts = ['installment_number', 'due_date', 'amount', 'status', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'due_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        return EmiInstallment::query()
            ->with(['sale:id,invoice_no,customer_id', 'sale.customer:id,name'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->whereHas('sale', function (Builder $query) use ($search) {
                    $query->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy($sort, $direction)
            ->orderBy('installment_number');
    }
}
