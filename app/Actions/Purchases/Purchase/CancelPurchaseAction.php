<?php

namespace App\Actions\Purchases\Purchase;

use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\AccountTransaction;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\PurchaseItem;
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
    public function execute(Purchase $purchase, bool $forAmendment = false): Purchase
    {
        if ($purchase->returns()->exists()) {
            throw ValidationException::withMessages([
                'purchase' => ['This purchase has a return recorded against it and can no longer be cancelled as a whole — the return already reversed the returned portion; cancelling now would double-reverse it. Contact an admin if further correction is needed.'],
            ]);
        }

        return DB::transaction(function () use ($purchase, $forAmendment) {
            // Lock first: a second Undo arriving together with the first must not reverse the purchase twice.
            if (Purchase::query()->whereKey($purchase->id)->lockForUpdate()->value('status') === PurchaseStatus::Cancelled) {
                return $purchase->fresh(['items.product', 'supplier']);
            }

            $purchase->load('items.product', 'supplier');

            if ($purchase->status === PurchaseStatus::Received) {
                foreach ($purchase->items as $item) {
                    $stockBefore = (float) $item->product->current_stock;
                    $averageBefore = (float) $item->product->avg_cost;

                    $this->stock->decrease($item->product, $item->quantity, StockMovementType::AdjustmentDecrease, 'purchase', $purchase->id, 'Purchase cancelled', unitCost: $item->unit_price, allowShortfall: $forAmendment);

                    $this->restoreAverageCost($purchase, $item, $stockBefore, $averageBefore);

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
     * Receiving a purchase blended its price into the product's weighted average cost; taking the receipt out has to take
     * that price out of the blend again, or a cancelled (or amended) purchase would keep pulling the average. The units
     * still held are valued at the average, so removing this batch at its own price leaves the average of what remains.
     * Sales never change the average, so the stock held now is the base. Nothing remains to value when the batch was
     * all sold: the next receipt then starts the average from its own price, exactly as for an empty shelf.
     */
    private function restoreAverageCost(Purchase $purchase, PurchaseItem $item, float $stockBefore, float $averageBefore): void
    {
        $remaining = $stockBefore - (float) $item->quantity;

        if ($remaining <= 0) {
            return;
        }

        // The price this batch entered the average at (its share of any invoice discount), as ConfirmPurchaseAction used.
        $batchPrice = $purchase->subtotal > 0
            ? (float) $item->unit_price * ((float) $purchase->total_amount / (float) $purchase->subtotal)
            : (float) $item->unit_price;

        $restored = (($stockBefore * $averageBefore) - ((float) $item->quantity * $batchPrice)) / $remaining;

        $item->product->forceFill(['avg_cost' => round(max($restored, 0.0), 2)])->save();
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
