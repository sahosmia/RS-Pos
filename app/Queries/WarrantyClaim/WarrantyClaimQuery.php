<?php

namespace App\Queries\WarrantyClaim;

use App\Models\WarrantyClaim;
use Illuminate\Database\Eloquent\Builder;

class WarrantyClaimQuery
{
    /**
     * Shared by the Warranty Claims list page and its export endpoint so the
     * two never drift apart.
     *
     * @param  array{status?: ?string}  $filters
     * @return Builder<WarrantyClaim>
     */
    public static function filtered(array $filters): Builder
    {
        return WarrantyClaim::query()
            ->with(['saleItem.product:id,name,sku', 'saleItem.sale:id,invoice_no,customer_id', 'saleItem.sale.customer:id,name'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->orderByDesc('claim_date')
            ->orderByDesc('id');
    }
}
