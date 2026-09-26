<?php

namespace App\Queries\ServiceRequest;

use App\Models\ServiceRequest;
use Illuminate\Database\Eloquent\Builder;

class ServiceRequestQuery
{
    /**
     * Shared by the Service Requests list page and its export endpoint so the
     * two never drift apart.
     *
     * @param  array{status?: ?string, type?: ?string, from?: ?string, to?: ?string}  $filters
     * @return Builder<ServiceRequest>
     */
    public static function filtered(array $filters): Builder
    {
        return ServiceRequest::query()
            ->with(['saleItem.product:id,name,sku', 'saleItem.sale:id,invoice_no,customer_id', 'saleItem.sale.customer:id,name', 'staff:id,name'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('request_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('request_date', '<=', $to))
            ->orderByDesc('request_date')
            ->orderByDesc('id');
    }
}
