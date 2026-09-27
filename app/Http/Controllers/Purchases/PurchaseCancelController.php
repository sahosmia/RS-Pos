<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\Purchase\CancelPurchaseAction;
use App\Enums\PurchaseStatus;
use App\Http\Controllers\Controller;
use App\Models\Purchase;
use Illuminate\Http\RedirectResponse;

class PurchaseCancelController extends Controller
{
    /**
     * "Undo" — reverses a Received purchase via compensating entries.
     */
    public function store(Purchase $purchase, CancelPurchaseAction $cancelPurchase): RedirectResponse
    {
        if ($purchase->status !== PurchaseStatus::Received) {
            return back()->withErrors(['purchase' => 'Only a received purchase can be cancelled.']);
        }

        $cancelPurchase->execute($purchase);

        return back();
    }
}
