<?php

namespace App\Actions\Sales\SalesOrder;

use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Enums\SalesOrderStatus;
use App\Models\Sale;
use App\Models\SalesOrder;
use App\Support\SerialSelections;
use Illuminate\Support\Arr;
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
     * @param  array<string, mixed>|null  $edited  The sale as edited on the Confirm page (items, discounts, EMI, date); null converts the order exactly as booked.
     */
    public function execute(SalesOrder $order, array $payments = [], array $serialNumbersByOrderItem = [], ?array $edited = null): Sale
    {
        return DB::transaction(function () use ($order, $payments, $serialNumbersByOrderItem, $edited) {
            $order = SalesOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($order->status === SalesOrderStatus::Completed) {
                return $order->sale()->firstOrFail();
            }

            if (! $order->canConvert()) {
                throw new \RuntimeException('Sales order cannot be converted.');
            }

            $order->load('items.product', 'customer');

            if ($edited !== null) {
                return $this->convertEdited($order, $payments, $edited);
            }

            // The sale is built from everything the order carried: line discounts, installation, warranty / service plan,
            // the invoice discount and the EMI terms. Nothing is asked again at delivery.
            $sale = $this->createSale->execute([
                'customer_id' => $order->customer_id,
                'sales_order_id' => $order->id,
                'sale_date' => today()->toDateString(),
                'status' => 'draft',
                'discount_type' => $order->discount_type?->value,
                'discount_value' => $order->discount_value,
                'financing_type' => $order->financing_type,
                'installment_count' => $order->installment_count,
                'emi_interest_method' => $order->emi_interest_method,
                'emi_annual_rate' => $order->emi_annual_rate,
                'emi_frequency' => $order->emi_frequency,
                'emi_tenure_value' => $order->emi_tenure_value,
                'emi_tenure_unit' => $order->emi_tenure_unit,
                'emi_installation_upfront' => $order->emi_installation_upfront,
                'items' => $order->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'original_price' => $item->original_price,
                    'unit_price' => $item->unit_price,
                    'discount_type' => $item->discount_type?->value,
                    'discount_value' => $item->discount_value,
                    'installation_required' => $item->installation_required,
                    'installation_charge' => $item->installation_charge,
                    'emi_financed' => $item->emi_financed,
                    'warranty_months' => $item->warranty_months,
                    'service_plan_included' => $item->service_plan_included,
                    'note' => $item->note,
                ])->all(),
            ]);

            // Serial numbers typed at delivery win; otherwise the ones planned on the order are used.
            $itemsForSerials = $order->items->map(fn ($item) => [
                'serial_numbers' => $serialNumbersByOrderItem[$item->id] ?? $item->serial_numbers ?? [],
            ])->all();
            $serialSelections = SerialSelections::extract($sale->items()->orderBy('id')->get(), $itemsForSerials);

            $sale = $this->confirmSale->execute($sale, $payments, $serialSelections);

            $order->forceFill(['status' => SalesOrderStatus::Completed])->save();

            return $sale;
        });
    }

    /**
     * The Confirm page: the order is opened in the sale form, anything can be changed (items, prices, discounts, EMI,
     * serials, payment), and what comes back is what is sold. The advance already taken is still folded in by
     * ConfirmSaleAction, so it is neither lost nor counted twice.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     * @param  array<string, mixed>  $edited
     */
    private function convertEdited(SalesOrder $order, array $payments, array $edited): Sale
    {
        $sale = $this->createSale->execute([
            ...Arr::only($edited, [
                'discount_type', 'discount_value', 'financing_type', 'installment_count', 'emi_interest_method', 'emi_annual_rate',
                'emi_frequency', 'emi_tenure_value', 'emi_tenure_unit', 'emi_installation_upfront', 'items',
            ]),
            'customer_id' => $order->customer_id,
            'sales_order_id' => $order->id,
            'sale_date' => $edited['sale_date'] ?? today()->toDateString(),
            'status' => 'draft',
        ]);

        $serialSelections = SerialSelections::extract($sale->items()->orderBy('id')->get(), $edited['items']);

        $sale = $this->confirmSale->execute($sale, $payments, $serialSelections);

        $order->forceFill(['status' => SalesOrderStatus::Completed])->save();

        return $sale;
    }
}
