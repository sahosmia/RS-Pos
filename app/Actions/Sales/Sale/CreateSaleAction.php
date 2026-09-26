<?php

namespace App\Actions\Sales\Sale;

use App\Models\Sale;
use App\Models\Settings;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Creates a Draft or Quotation sale — no stock/ledger effect yet. Only
 * ConfirmSaleAction (moving it to Confirmed) touches stock and the
 * customer's ledger.
 */
class CreateSaleAction
{
    /**
     * @param  array{customer_id: int, sales_order_id?: int|null, invoice_no?: string|null, sale_date: string, status: string, source?: string, discount_type?: string|null, discount_value?: float|string|null, valid_until?: string|null, financing_type?: string, installment_count?: int|string|null, items: array<int, array{product_id: int, quantity: float|string, unit_price: float|string, installation_required?: bool, installation_charge?: float|string|null, note?: string|null, serial_numbers?: array<int, string>}>}  $data
     */
    public function execute(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $sale = Sale::create([
                'customer_id' => $data['customer_id'],
                'sales_order_id' => $data['sales_order_id'] ?? null,
                // Import Sales (পর্ব ২) carries its own historical invoice
                // number forward instead of drawing a new one.
                'invoice_no' => $data['invoice_no'] ?? Settings::current()->generateInvoiceNumber(),
                'sale_date' => $data['sale_date'],
                'status' => $data['status'],
                'source' => $data['source'] ?? 'manual',
                'discount_type' => $data['discount_type'] ?? null,
                'discount_value' => $data['discount_value'] ?? 0,
                'valid_until' => $data['valid_until'] ?? null,
                'financing_type' => $data['financing_type'] ?? 'one_time',
                'installment_count' => $data['installment_count'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $totals = SaleTotals::sync($sale, $data['items']);
            $totals->applyTo($sale);

            return $sale;
        });
    }
}
