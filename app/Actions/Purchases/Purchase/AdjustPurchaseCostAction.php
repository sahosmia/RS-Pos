<?php

namespace App\Actions\Purchases\Purchase;

use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Corrects the PRICE on a Received purchase without touching the units: quantities, stock and serial numbers stay exactly
 * as they are, so it works even when some of the goods were already sold (where a full amendment is impossible).
 *
 * Only the money moves, with one adjustment entry dated today (the period you are in, never an old one):
 *  - what is owed to the supplier goes up or down by the difference;
 *  - the part of that difference that sits in the units still held changes the Inventory value and the product's average
 *    cost; the part that belongs to units already sold is a cost variance on the cost of goods sold;
 *  - earlier sales keep the cost they were recorded at (that history is never rewritten), so their profit does not move.
 */
class AdjustPurchaseCostAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array<int, float|string>  $newUnitPrices  The new net unit price of each line, keyed by purchase_item id.
     */
    public function execute(Purchase $purchase, array $newUnitPrices, string $reason): Purchase
    {
        return DB::transaction(function () use ($purchase, $newUnitPrices, $reason) {
            Purchase::query()->whereKey($purchase->id)->lockForUpdate()->first();
            $purchase->refresh()->load('items.product', 'supplier');

            $this->assertAdjustable($purchase);

            $oldTotal = (float) $purchase->total_amount;
            $oldSubtotal = (float) $purchase->subtotal;

            // The price each unit entered the average at before: its price scaled by any invoice discount, as ConfirmPurchaseAction used.
            $oldCost = $purchase->items->mapWithKeys(fn (PurchaseItem $item) => [
                $item->id => $oldSubtotal > 0 ? (float) $item->unit_price * ($oldTotal / $oldSubtotal) : (float) $item->unit_price,
            ]);

            $this->applyNewPrices($purchase, $newUnitPrices);

            $purchase->refresh()->load('items.product');
            $newTotal = (float) $purchase->total_amount;
            $newSubtotal = (float) $purchase->subtotal;

            $payableChange = round($newTotal - $oldTotal, 2);

            if (abs($payableChange) < 0.005) {
                return $purchase;
            }

            [$inventoryChange, $costOfGoodsChange] = $this->spreadOverUnits($purchase, $oldCost, $newTotal, $newSubtotal, $payableChange);

            $this->ledger->recordContact($purchase->supplier, ContactLedgerType::Adjustment, -$payableChange, 'purchase', $purchase->id, 'Purchase cost adjusted');
            $this->postJournal($purchase, $payableChange, $inventoryChange, $costOfGoodsChange);

            $purchase->recalculatePaymentTotals();

            if ($purchase->due_amount < 0) {
                throw ValidationException::withMessages([
                    'items' => 'The new total cannot go below the ৳'.number_format((float) $purchase->paid_amount, 2).' already paid or credited on this purchase.',
                ]);
            }

            activity()
                ->performedOn($purchase)
                ->causedBy(Auth::user())
                ->withProperties(['reason' => $reason, 'total_before' => $oldTotal, 'total_after' => $newTotal])
                ->log('cost adjusted');

            return $purchase;
        });
    }

    private function assertAdjustable(Purchase $purchase): void
    {
        $blockedBy = match (true) {
            $purchase->status !== PurchaseStatus::Received => 'Only a received purchase has a cost to adjust.',
            $purchase->returns()->exists() => 'This purchase has a return recorded against it — its cost can no longer be adjusted.',
            default => null,
        };

        if ($blockedBy !== null) {
            throw ValidationException::withMessages(['purchase' => [$blockedBy]]);
        }
    }

    /**
     * Writes the new net price on each line (a price change replaces any line discount, which is what the new price is net of)
     * and recomputes the purchase totals from them and the invoice discount.
     *
     * @param  array<int, float|string>  $newUnitPrices
     */
    private function applyNewPrices(Purchase $purchase, array $newUnitPrices): void
    {
        $subtotal = 0.0;

        foreach ($purchase->items as $item) {
            if (array_key_exists($item->id, $newUnitPrices)) {
                $price = round((float) $newUnitPrices[$item->id], 4);

                if (abs($price - (float) $item->unit_price) > 0.00001) {
                    $item->forceFill([
                        'original_price' => $price,
                        'unit_price' => $price,
                        'discount_type' => null,
                        'discount_value' => 0,
                        'discount_amount' => 0,
                        'subtotal' => round((float) $item->quantity * $price, 2),
                    ])->save();
                }
            }

            $subtotal += (float) $item->subtotal;
        }

        $subtotal = round($subtotal, 2);
        $discount = PurchaseTotals::applyDiscount($subtotal, $purchase->discount_type, (float) $purchase->discount_value);

        $purchase->forceFill([
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'total_amount' => round($subtotal - $discount, 2),
        ])->save();
    }

    /**
     * Splits the cost difference between the units still held (Inventory and the average cost) and the units already
     * sold (cost of goods sold), and moves each product's average cost by its held share.
     *
     * @param  Collection<int, float>  $oldCost
     * @return array{0: float, 1: float} Inventory change, cost-of-goods-sold change.
     */
    private function spreadOverUnits(Purchase $purchase, $oldCost, float $newTotal, float $newSubtotal, float $payableChange): array
    {
        $heldLeft = [];
        $heldValueChange = [];
        $inventoryChange = 0.0;

        foreach ($purchase->items as $item) {
            $product = Product::query()->lockForUpdate()->findOrFail($item->product_id);
            $heldLeft[$product->id] ??= max((float) $product->current_stock, 0.0);

            $newCost = $newSubtotal > 0 ? (float) $item->unit_price * ($newTotal / $newSubtotal) : (float) $item->unit_price;
            $difference = $newCost - (float) $oldCost[$item->id];

            // Units of this line that are still on the shelf (the rest were sold); a product shared by several lines uses its stock once.
            $held = min((float) $item->quantity, $heldLeft[$product->id]);
            $heldLeft[$product->id] -= $held;

            $heldValueChange[$product->id] = ($heldValueChange[$product->id] ?? 0.0) + $held * $difference;
            $inventoryChange += $held * $difference;
        }

        foreach ($heldValueChange as $productId => $change) {
            $product = Product::query()->findOrFail($productId);

            if ($product->current_stock > 0) {
                $product->forceFill(['avg_cost' => round(max((float) $product->avg_cost + $change / (float) $product->current_stock, 0.0), 2)])->save();
            }
        }

        $inventoryChange = round($inventoryChange, 2);

        // Whatever is not in held units is the variance on goods already sold; this also absorbs any rounding.
        return [$inventoryChange, round($payableChange - $inventoryChange, 2)];
    }

    private function postJournal(Purchase $purchase, float $payableChange, float $inventoryChange, float $costOfGoodsChange): void
    {
        $lines = [];

        foreach ([
            [$this->chartOfAccounts->code('2100'), -$payableChange],   // Accounts Payable: a credit when more is owed
            [$this->chartOfAccounts->code('1200'), $inventoryChange],  // Inventory: a debit when the held units cost more
            [$this->chartOfAccounts->code('5100'), $costOfGoodsChange], // Cost of goods sold: a debit when the sold units cost more
        ] as [$account, $amount]) {
            if (abs($amount) < 0.005) {
                continue;
            }

            // Payables carries a credit balance (sign flipped above); the other two are debit accounts.
            $lines[] = [
                'chart_of_account_id' => $account->id,
                'debit' => $amount > 0 ? $amount : 0,
                'credit' => $amount < 0 ? -$amount : 0,
            ];
        }

        $this->journal->post(today(), "Purchase {$purchase->invoice_no}: cost adjusted", $lines, 'purchase', $purchase->id);
    }
}
