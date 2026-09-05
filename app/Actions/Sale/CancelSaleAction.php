<?php

namespace App\Actions\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\AccountTransaction;
use App\Models\Sale;
use App\Services\AccountService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

/**
 * Reverses a Confirmed sale via new compensating entries (never edits or
 * deletes history) and marks it Cancelled — the "Undo" toast's target
 * (Task 6.10), though nothing here is time-limited server-side; the
 * 30-second window is purely a UI affordance.
 */
class CancelSaleAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
    ) {}

    public function execute(Sale $sale): Sale
    {
        return DB::transaction(function () use ($sale) {
            $sale->load('items.product', 'customer');

            if ($sale->source !== SaleSource::Imported) {
                foreach ($sale->items as $item) {
                    $this->stock->increase($item->product, $item->quantity, StockMovementType::AdjustmentIncrease, 'sale', $sale->id, 'Sale cancelled', unitCost: $item->cost_at_sale);

                    if ($item->product->track_serial_number) {
                        $item->serialNumbers()->update(['status' => SerialNumberStatus::InStock, 'sale_item_id' => null]);
                    }
                }

                if ($sale->due_amount !== 0.0) {
                    $this->ledger->recordContact($sale->customer, ContactLedgerType::Adjustment, -$sale->due_amount, 'sale', $sale->id, 'Sale cancelled');
                }

                if ($sale->paid_amount > 0.0) {
                    $this->reverseAccountPayments($sale);
                }
            }

            $sale->update(['status' => SaleStatus::Cancelled]);

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    /**
     * One reversing transaction per original account_transaction, so each
     * account's balance moves back by exactly what it received.
     */
    private function reverseAccountPayments(Sale $sale): void
    {
        $original = AccountTransaction::query()
            ->where('reference_type', 'sale')
            ->where('reference_id', $sale->id)
            ->where('type', AccountTransactionType::SalePayment)
            ->get();

        foreach ($original as $transaction) {
            $this->accounts->record(
                $transaction->account,
                AccountTransactionType::SalePayment,
                -$transaction->amount,
                today(),
                'sale',
                $sale->id,
                'Sale cancelled',
            );
        }
    }
}
