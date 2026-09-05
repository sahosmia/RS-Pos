<?php

namespace App\Actions\Sale;

use App\Models\Sale;
use Illuminate\Support\Facades\DB;

/**
 * Only reachable while the sale is still Draft/Quotation — guarded by
 * Sale::canEdit() at the controller layer, since it has no stock movement
 * or ledger entry to keep consistent yet.
 */
class UpdateSaleAction
{
    /**
     * @param  array{customer_id: int, sale_date: string, status: string, discount_type?: string|null, discount_value?: float|string|null, valid_until?: string|null, financing_type?: string, items: array<int, array{product_id: int, quantity: float|string, unit_price: float|string, installation_required?: bool, installation_charge?: float|string|null, note?: string|null, serial_numbers?: array<int, string>}>}  $data
     */
    public function execute(Sale $sale, array $data): Sale
    {
        return DB::transaction(function () use ($sale, $data) {
            $sale->update([
                'customer_id' => $data['customer_id'],
                'sale_date' => $data['sale_date'],
                'status' => $data['status'],
                'discount_type' => $data['discount_type'] ?? null,
                'discount_value' => $data['discount_value'] ?? 0,
                'valid_until' => $data['valid_until'] ?? null,
                'financing_type' => $data['financing_type'] ?? 'one_time',
            ]);

            SaleTotals::sync($sale, $data['items'])->applyTo($sale);

            return $sale;
        });
    }
}
