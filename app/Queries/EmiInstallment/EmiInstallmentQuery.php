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
     * @param  array{status?: ?string, search?: ?string}  $filters
     * @return Builder<EmiInstallment>
     */
    public static function filtered(array $filters): Builder
    {
        $search = $filters['search'] ?? '';

        return EmiInstallment::query()
            ->with(['sale:id,invoice_no,customer_id', 'sale.customer:id,name'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->whereHas('sale', function (Builder $query) use ($search) {
                    $query->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('due_date')
            ->orderBy('installment_number');
    }
}
