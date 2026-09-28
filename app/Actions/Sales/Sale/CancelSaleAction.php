<?php

namespace App\Actions\Sales\Sale;

use App\Enums\ContactLedgerType;
use App\Enums\EmiInstallmentStatus;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\AccountTransaction;
use App\Models\JournalEntry;
use App\Models\Sale;
use App\Services\AccountService;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
        private JournalService $journal,
    ) {}

    /**
     * @throws ValidationException When a SaleReturn already exists against
     *                             this sale — see the guard below.
     */
    public function execute(Sale $sale): Sale
    {
        if ($sale->returns()->exists()) {
            throw ValidationException::withMessages([
                'sale' => ['This sale has a return recorded against it and can no longer be cancelled as a whole — the return already reversed the returned portion; cancelling now would double-reverse it. Contact an admin if further correction is needed.'],
            ]);
        }

        return DB::transaction(function () use ($sale) {
            $sale->load('items.product', 'customer');

            if ($sale->source !== SaleSource::Imported) {
                foreach ($sale->items as $item) {
                    $this->stock->increase($item->product, $item->quantity, StockMovementType::AdjustmentIncrease, 'sale', $sale->id, 'Sale cancelled', unitCost: $item->cost_at_sale);

                    if ($item->product->track_serial_number) {
                        $item->serialNumbers()->update(['status' => SerialNumberStatus::InStock, 'sale_item_id' => null]);
                    }
                }

                if (abs($sale->due_amount) > 0.001) {
                    $this->ledger->recordContact($sale->customer, ContactLedgerType::Adjustment, -$sale->due_amount, 'sale', $sale->id, 'Sale cancelled');
                }

                if (abs($sale->paid_amount) > 0.001) {
                    $this->reverseAccountPayments($sale);
                }

                $this->reverseJournalEntry($sale);
                $this->voidPendingEmiInstallments($sale);
            }

            $sale->update(['status' => SaleStatus::Cancelled]);

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    /**
     * One reversing transaction per original account_transaction tagged to
     * this sale, so each account's balance moves back by exactly what it
     * received — regardless of *how* it was received. This deliberately has
     * no `type` filter: a confirm-time/AddSalePaymentAction payment is typed
     * `SalePayment`, but a PayEmiInstallmentAction payment is typed
     * `EmiPayment` — both move real cash against this sale and both must be
     * reversed on a full cancel, or the account's cached balance stays
     * inflated relative to the books forever. Each reversal keeps the
     * original transaction's own type rather than hardcoding one, so an
     * EMI reversal still reads as an EMI movement (not a phantom sale
     * payment) in any type-based reporting.
     */
    private function reverseAccountPayments(Sale $sale): void
    {
        $original = AccountTransaction::query()
            ->where('reference_type', 'sale')
            ->where('reference_id', $sale->id)
            ->get();

        foreach ($original as $transaction) {
            $this->accounts->record(
                $transaction->account,
                $transaction->type,
                -$transaction->amount,
                today(),
                'sale',
                $sale->id,
                'Sale cancelled',
            );
        }
    }

    /**
     * Every installment that hasn't already been Paid is dead once the
     * parent sale is cancelled — voided rather than deleted, so a Paid
     * sibling's history (and this row's own due_date/amount) survives.
     * `PayEmiInstallmentAction`/`PayEmiInstallmentRequest` also refuse to
     * pay a Cancelled sale's installment directly, but this is what stops
     * one from ever being payable in the first place after cancellation.
     */
    private function voidPendingEmiInstallments(Sale $sale): void
    {
        $sale->emiInstallments()
            ->where('status', '!=', EmiInstallmentStatus::Paid)
            ->update(['status' => EmiInstallmentStatus::Cancelled]);
    }

    /**
     * A sale can have more than one posted entry against it — the
     * confirm-time one (Dr AR/Cash Cr Revenue, Dr COGS Cr Inventory, plus
     * one line pair per payment made at confirm time) and, separately, one
     * per AddSalePaymentAction payment collected afterward. Every one of
     * them gets reversed, not just the first.
     */
    private function reverseJournalEntry(Sale $sale): void
    {
        JournalEntry::query()
            ->where('reference_type', 'sale')
            ->where('reference_id', $sale->id)
            ->where('status', 'posted')
            ->get()
            ->each(fn (JournalEntry $entry) => $this->journal->reverse($entry, 'Sale cancelled'));
    }
}
