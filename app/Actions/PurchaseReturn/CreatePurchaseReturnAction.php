<?php

namespace App\Actions\PurchaseReturn;

use App\Enums\ContactLedgerType;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Exceptions\ReturnQuantityExceedsRemainingException;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseReturn;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Every return is a brand-new immutable record — nothing here ever edits an
 * earlier return.
 */
class CreatePurchaseReturnAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{purchase_id: int, return_date: string, reason?: string|null, items: array<int, array{purchase_item_id: int, quantity: float|string}>}  $data
     *
     * @throws ReturnQuantityExceedsRemainingException
     */
    public function execute(array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($data) {
            $purchase = Purchase::with(['items.product', 'supplier'])->findOrFail($data['purchase_id']);

            $return = PurchaseReturn::create([
                'purchase_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'return_date' => $data['return_date'],
                'reason' => $data['reason'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $totalAmount = 0.0;

            foreach ($data['items'] as $itemData) {
                /** @var PurchaseItem $purchaseItem */
                $purchaseItem = $purchase->items->firstWhere('id', (int) $itemData['purchase_item_id']);
                $quantity = round((float) $itemData['quantity'], 2);

                $this->assertWithinRemaining($purchaseItem, $quantity);

                $subtotal = round($quantity * $purchaseItem->unit_price, 2);

                $return->items()->create([
                    'purchase_item_id' => $purchaseItem->id,
                    'product_id' => $purchaseItem->product_id,
                    'quantity' => $quantity,
                    'unit_price' => $purchaseItem->unit_price,
                    'subtotal' => $subtotal,
                ]);

                $this->stock->decrease(
                    $purchaseItem->product,
                    $quantity,
                    StockMovementType::PurchaseReturn,
                    'purchase_return',
                    $return->id,
                    unitCost: $purchaseItem->unit_price,
                );

                if ($purchaseItem->product->track_serial_number) {
                    $this->disposeSerials($purchaseItem, (int) $quantity);
                }

                $totalAmount += $subtotal;
            }

            $totalAmount = round($totalAmount, 2);
            $return->forceFill(['total_amount' => $totalAmount])->save();

            $this->ledger->recordContact($purchase->supplier, ContactLedgerType::PurchaseReturn, $totalAmount, 'purchase_return', $return->id, $data['reason'] ?? null);

            $this->postJournal($return, $totalAmount);

            return $return->fresh(['items.product', 'supplier']);
        });
    }

    /**
     * @throws ReturnQuantityExceedsRemainingException
     */
    private function assertWithinRemaining(PurchaseItem $purchaseItem, float $quantity): void
    {
        $alreadyReturned = $purchaseItem->returnItems()->sum('quantity');
        $remaining = $purchaseItem->quantity - $alreadyReturned;

        if ($quantity > $remaining) {
            throw new ReturnQuantityExceedsRemainingException(
                "Cannot return {$quantity} of \"{$purchaseItem->product->name}\" — only {$remaining} remaining.",
            );
        }
    }

    /**
     * A unit sent back to the supplier has permanently left our inventory —
     * unlike a customer's Sale Return, there's no "back in stock after
     * inspection" step for it, so it goes straight to disposed rather than
     * a status that implies it might still be sold.
     */
    private function disposeSerials(PurchaseItem $purchaseItem, int $quantity): void
    {
        $purchaseItem->serialNumbers()
            ->where('status', SerialNumberStatus::InStock)
            ->orderBy('id')
            ->limit($quantity)
            ->get()
            ->each(fn ($serial) => $serial->update(['status' => SerialNumberStatus::Disposed]));
    }

    /**
     * Dr Accounts Payable / Cr Inventory, at the original purchase
     * unit_cost — the reverse of what receiving the purchase posted.
     */
    private function postJournal(PurchaseReturn $return, float $totalAmount): void
    {
        $payable = $this->chartOfAccounts->code('2100');
        $inventory = $this->chartOfAccounts->code('1200');

        $this->journal->post(
            $return->return_date,
            "Purchase return for {$return->purchase->invoice_no}",
            [
                ['chart_of_account_id' => $payable->id, 'debit' => $totalAmount, 'credit' => 0],
                ['chart_of_account_id' => $inventory->id, 'debit' => 0, 'credit' => $totalAmount],
            ],
            'purchase_return',
            $return->id,
        );
    }
}
