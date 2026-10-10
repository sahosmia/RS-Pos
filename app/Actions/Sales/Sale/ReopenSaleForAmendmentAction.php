<?php

namespace App\Actions\Sales\Sale;

use App\Enums\SaleStatus;
use App\Models\Sale;
use App\Models\ServiceRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * First half of editing a Confirmed sale. It reverses the sale exactly as a cancellation does (stock back in, serials
 * back In stock, the customer's due, the payments and the journal all reversed with new opposite entries) and then
 * turns the same row back into a Draft, keeping its invoice number, so the caller can save the corrected version and
 * confirm it again. Call it inside the same database transaction as the rest of the amendment: if the corrected sale
 * cannot be confirmed (not enough stock, a bad serial, a closed period) everything rolls back to the original sale.
 */
class ReopenSaleForAmendmentAction
{
    public function __construct(private CancelSaleAction $cancelSale) {}

    /**
     * The cost each product was sold at, with how many units — what an amendment must keep for the units it sells again.
     * Read it BEFORE the sale is reopened (reopening replaces the lines).
     *
     * @return array<int, array{quantity: float, unit_cost: float}>
     */
    public function costsToKeep(Sale $sale): array
    {
        $kept = [];

        foreach ($sale->items()->get() as $item) {
            $quantity = (float) $item->quantity;
            $entry = $kept[$item->product_id] ?? ['quantity' => 0.0, 'unit_cost' => 0.0];
            $total = $entry['quantity'] + $quantity;

            // Several lines of one product: the cost is their weighted average.
            $kept[$item->product_id] = [
                'quantity' => $total,
                'unit_cost' => $total > 0 ? (($entry['quantity'] * $entry['unit_cost']) + ($quantity * (float) $item->cost_at_sale)) / $total : 0.0,
            ];
        }

        return $kept;
    }

    public function execute(Sale $sale, string $reason): Sale
    {
        return DB::transaction(function () use ($sale, $reason) {
            // Same lock as confirm / cancel: two amendments at once must not both reverse the sale.
            Sale::query()->whereKey($sale->id)->lockForUpdate()->first();
            $sale->refresh();

            if ($blockedBy = $sale->amendBlockReason()) {
                throw ValidationException::withMessages(['sale' => [$blockedBy]]);
            }

            $itemIds = $sale->items()->pluck('id');

            $this->cancelSale->execute($sale);

            // The installation request made at confirm time is made again by the new confirmation. It carries no money.
            ServiceRequest::query()->whereIn('sale_item_id', $itemIds)->delete();
            // Unpaid instalments of the old plan (amendBlockReason refused any that were paid); the new confirm lays out its own.
            $sale->emiInstallments()->delete();

            $sale->refresh();
            $sale->forceFill(['status' => SaleStatus::Draft, 'paid_amount' => 0, 'due_amount' => $sale->total_amount, 'payment_status' => 'due'])->save();

            activity()
                ->performedOn($sale)
                ->causedBy(Auth::user())
                ->withProperties(['reason' => $reason])
                ->log('amended');

            return $sale;
        });
    }
}
