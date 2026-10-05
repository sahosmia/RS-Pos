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
     * "Undo" — reverses a Received purchase via compensating entries; a Draft/Ordered one just hands back any advance payment.
     */
    public function store(Purchase $purchase, CancelPurchaseAction $cancelPurchase): RedirectResponse
    {
        if ($purchase->status === PurchaseStatus::Cancelled) {
            return back()->withErrors(['purchase' => 'This purchase is already cancelled.']);
        }

        $cancelPurchase->execute($purchase);

        return back();
    }
}
