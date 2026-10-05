<?php

namespace App\Actions\Purchases\Purchase;

use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\AccountTransaction;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Services\AccountService;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reverses a Received purchase via new compensating entries (never edits or
 * deletes history) and marks it Cancelled.
 */
class CancelPurchaseAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
    ) {}

    /**
     * @throws ValidationException When a PurchaseReturn already exists against
     *                             this purchase — see the guard below.
     */
    public function execute(Purchase $purchase): Purchase
    {
        if ($purchase->returns()->exists()) {
            throw ValidationException::withMessages([
                'purchase' => ['This purchase has a return recorded against it and can no longer be cancelled as a whole — the return already reversed the returned portion; cancelling now would double-reverse it. Contact an admin if further correction is needed.'],
            ]);
        }

        return DB::transaction(function () use ($purchase) {
            $purchase->load('items.product', 'supplier');

            if ($purchase->status === PurchaseStatus::Received) {
                foreach ($purchase->items as $item) {
                    $this->stock->decrease($item->product, $item->quantity, StockMovementType::AdjustmentDecrease, 'purchase', $purchase->id, 'Purchase cancelled', unitCost: $item->unit_price);

                    if ($item->product->track_serial_number) {
                        $soldSerials = $item->serialNumbers()->where('status', '!=', SerialNumberStatus::InStock)->exists();
                        if ($soldSerials) {
                            throw ValidationException::withMessages([
                                'purchase' => ["Cannot cancel purchase because serial numbers for \"{$item->product->name}\" have already been sold or transferred."],
                            ]);
                        }
                        $item->serialNumbers()->delete();
                    }
                }

                if (abs($purchase->due_amount) > 0.001) {
                    $this->ledger->recordContact($purchase->supplier, ContactLedgerType::Adjustment, -$purchase->due_amount, 'purchase', $purchase->id, 'Purchase cancelled');
                }

                if (abs($purchase->paid_amount) > 0.001) {
                    $this->reverseAccountPayments($purchase);
                }

                $this->reverseJournalEntry($purchase);
            } elseif (abs($purchase->paid_amount) > 0.001) {
                $this->reverseAdvancePayments($purchase);
            }

            $purchase->update(['status' => PurchaseStatus::Cancelled]);

            return $purchase->fresh(['items.product', 'supplier']);
        });
    }

    /**
     * A Draft/Ordered purchase has no stock or bill yet, but it can carry an advance payment (and applied
     * supplier credit): hand the money back to the accounts and undo the supplier-ledger and journal entries.
     */
    private function reverseAdvancePayments(Purchase $purchase): void
    {
        $ledgerNet = (float) DB::table('contact_ledger')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $purchase->id)
            ->sum('amount');

        if (abs($ledgerNet) > 0.001) {
            $this->ledger->recordContact($purchase->supplier, ContactLedgerType::Adjustment, -$ledgerNet, 'purchase', $purchase->id, 'Purchase cancelled');
        }

        $this->reverseAccountPayments($purchase);
        $this->reverseJournalEntry($purchase);
    }

    private function reverseAccountPayments(Purchase $purchase): void
    {
        $original = AccountTransaction::query()
            ->where('reference_type', 'purchase')
            ->where('reference_id', $purchase->id)
            ->get();

        foreach ($original as $transaction) {
            $this->accounts->record(
                $transaction->account,
                $transaction->type,
                -$transaction->amount,
                today(),
                'purchase',
                $purchase->id,
                'Purchase cancelled',
            );
        }
    }

    private function reverseJournalEntry(Purchase $purchase): void
    {
        JournalEntry::query()
            ->where('reference_type', 'purchase')
            ->where('reference_id', $purchase->id)
            ->where('status', 'posted')
            ->get()
            ->each(fn (JournalEntry $entry) => $this->journal->reverse($entry, 'Purchase cancelled'));
    }
}
