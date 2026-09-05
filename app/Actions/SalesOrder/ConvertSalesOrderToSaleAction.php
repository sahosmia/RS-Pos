<?php

namespace App\Actions\SalesOrder;

use App\Actions\Sale\ConfirmSaleAction;
use App\Actions\Sale\CreateSaleAction;
use App\Enums\SalesOrderStatus;
use App\Models\Sale;
use App\Models\SalesOrder;
use App\Support\SerialSelections;
use Illuminate\Support\Facades\DB;

/**
 * Fulfils a Sales Order by creating and confirming a real Sale against it —
 * stock/ledger/account only ever move through ConfirmSaleAction, exactly
 * like any other sale. The advance already collected at booking time is
 * never re-recorded here: Sale::recalculatePaymentTotals() folds it in by
 * reading the same account_transactions row (still keyed
 * reference_type = 'sales_order', never rewritten), so that earlier cash
 * movement is neither touched nor duplicated — only `payments` for any
 * *additional* amount collected at delivery time moves money here.
 */
class ConvertSalesOrderToSaleAction
{
    public function __construct(
        private CreateSaleAction $createSale,
        private ConfirmSaleAction $confirmSale,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments  Any amount collected on top of the advance, at fulfillment time.
     * @param  array<int, array<int, string>>  $serialNumbersByOrderItem  Keyed by sales_order_item id.
     */
    public function execute(SalesOrder $order, array $payments = [], array $serialNumbersByOrderItem = []): Sale
    {
        if ($order->status === SalesOrderStatus::Completed) {
            return $order->sale()->firstOrFail();
        }

        return DB::transaction(function () use ($order, $payments, $serialNumbersByOrderItem) {
            $order->load('items.product', 'customer');

            $sale = $this->createSale->execute([
                'customer_id' => $order->customer_id,
                'sales_order_id' => $order->id,
                'sale_date' => today()->toDateString(),
                'status' => 'draft',
                'items' => $order->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                ])->all(),
            ]);

            $itemsForSerials = $order->items->map(fn ($item) => [
                'serial_numbers' => $serialNumbersByOrderItem[$item->id] ?? [],
            ])->all();
            $serialSelections = SerialSelections::extract($sale->items()->orderBy('id')->get(), $itemsForSerials);

            $sale = $this->confirmSale->execute($sale, $payments, $serialSelections);

            $order->forceFill(['status' => SalesOrderStatus::Completed])->save();

            return $sale;
        });
    }
}
