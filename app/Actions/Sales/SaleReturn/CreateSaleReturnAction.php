<?php

namespace App\Actions\Sales\SaleReturn;

use App\Enums\ContactLedgerType;
use App\Enums\SerialNumberStatus;
use App\Enums\ServiceRequestStatus;
use App\Enums\ServiceRequestType;
use App\Enums\StockMovementType;
use App\Exceptions\ReturnQuantityExceedsRemainingException;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Every return is a brand-new immutable record — nothing here ever edits an
 * earlier return; a correction is simply a different return (or, for a
 * mistaken one, reversing its journal entry — not built here since nothing
 * in this app yet exposes "undo a return").
 */
class CreateSaleReturnAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{sale_id: int, return_date: string, reason?: string|null, items: array<int, array{sale_item_id: int, quantity: float|string}>}  $data
     *
     * @throws ReturnQuantityExceedsRemainingException
     */
    public function execute(array $data): SaleReturn
    {
        return DB::transaction(function () use ($data) {
            $sale = Sale::with(['items.product', 'customer'])->findOrFail($data['sale_id']);

            $return = SaleReturn::create([
                'sale_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'return_date' => $data['return_date'],
                'reason' => $data['reason'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $totalAmount = 0.0;
            $costTotal = 0.0;

            $discountRatio = ($sale->subtotal > 0 && $sale->discount_amount > 0)
                ? ($sale->discount_amount / $sale->subtotal)
                : 0.0;

            foreach ($data['items'] as $itemData) {
                /** @var SaleItem $saleItem */
                $saleItem = $sale->items->firstWhere('id', (int) $itemData['sale_item_id']);
                $quantity = round((float) $itemData['quantity'], 2);

                $this->assertWithinRemaining($saleItem, $quantity);

                $rawSubtotal = round($quantity * $saleItem->unit_price, 2);
                $discountPortion = round($rawSubtotal * $discountRatio, 2);
                $subtotal = round($rawSubtotal - $discountPortion + $this->refundableInstallation($saleItem, $quantity), 2);
                $effectiveUnitPrice = $quantity > 0 ? round($subtotal / $quantity, 4) : $saleItem->unit_price;

                $return->items()->create([
                    'sale_item_id' => $saleItem->id,
                    'product_id' => $saleItem->product_id,
                    'quantity' => $quantity,
                    'unit_price' => $effectiveUnitPrice,
                    'subtotal' => $subtotal,
                ]);

                $this->stock->increase(
                    $saleItem->product,
                    $quantity,
                    StockMovementType::SaleReturn,
                    'sale_return',
                    $return->id,
                    unitCost: $saleItem->cost_at_sale,
                );

                if ($saleItem->product->track_serial_number) {
                    $this->returnSerials($saleItem, (int) $quantity);
                }

                $totalAmount += $subtotal;
                $costTotal += round($quantity * $saleItem->cost_at_sale, 2);
            }

            $totalAmount = round($totalAmount, 2);
            $costTotal = round($costTotal, 2);

            $return->forceFill(['total_amount' => $totalAmount])->save();

            $this->ledger->recordContact($sale->customer, ContactLedgerType::SaleReturn, -$totalAmount, 'sale_return', $return->id, $data['reason'] ?? null);

            $this->postJournal($return, $totalAmount, $costTotal);

            return $return->fresh(['items.product', 'customer']);
        });
    }

    /**
     * The installation charge goes back with the goods only while the installation has not been carried out —
     * once its service request is Completed the work was done and the charge stays, so only the goods' value is refunded.
     */
    private function refundableInstallation(SaleItem $saleItem, float $quantity): float
    {
        if (! $saleItem->installation_required || (float) $saleItem->installation_charge <= 0 || (float) $saleItem->quantity <= 0) {
            return 0.0;
        }

        $installed = $saleItem->serviceRequests()
            ->where('type', ServiceRequestType::Installation)
            ->where('status', ServiceRequestStatus::Completed)
            ->exists();

        return $installed ? 0.0 : round((float) $saleItem->installation_charge * $quantity / (float) $saleItem->quantity, 2);
    }

    /**
     * @throws ReturnQuantityExceedsRemainingException
     */
    private function assertWithinRemaining(SaleItem $saleItem, float $quantity): void
    {
        $alreadyReturned = $saleItem->returnItems()->sum('quantity');
        $remaining = $saleItem->quantity - $alreadyReturned;

        if ($quantity > $remaining) {
            throw new ReturnQuantityExceedsRemainingException(
                "Cannot return {$quantity} of \"{$saleItem->product->name}\" — only {$remaining} remaining.",
            );
        }
    }

    /**
     * Marks that many of this line's sold units returned — which specific
     * serials isn't asked of the cashier (no serial picker on the Create
     * Return page), so the oldest still-sold rows for this exact line are
     * chosen deterministically.
     */
    private function returnSerials(SaleItem $saleItem, int $quantity): void
    {
        $saleItem->serialNumbers()
            ->where('status', SerialNumberStatus::Sold)
            ->orderBy('id')
            ->limit($quantity)
            ->get()
            ->each(fn ($serial) => $serial->update(['status' => SerialNumberStatus::Returned]));
    }

    /**
     * Dr Sales Returns & Allowances (contra-income) / Cr Accounts
     * Receivable for the return's selling-price value, plus Dr Inventory /
     * Cr Cost of Goods Sold at the original cost_at_sale — stock coming
     * back in reverses exactly what the sale sent out.
     */
    private function postJournal(SaleReturn $return, float $totalAmount, float $costTotal): void
    {
        $returnsAllowances = $this->chartOfAccounts->code('4150');
        $receivable = $this->chartOfAccounts->code('1100');

        $lines = [
            ['chart_of_account_id' => $returnsAllowances->id, 'debit' => $totalAmount, 'credit' => 0],
            ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $totalAmount],
        ];

        if ($costTotal > 0.0) {
            $inventory = $this->chartOfAccounts->code('1200');
            $cogs = $this->chartOfAccounts->code('5100');

            $lines[] = ['chart_of_account_id' => $inventory->id, 'debit' => $costTotal, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $cogs->id, 'debit' => 0, 'credit' => $costTotal];
        }

        $this->journal->post(
            $return->return_date,
            "Sale return for {$return->sale->invoice_no}",
            $lines,
            'sale_return',
            $return->id,
        );
    }
}
