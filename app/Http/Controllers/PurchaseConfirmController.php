<?php

namespace App\Http\Controllers;

use App\Actions\Purchase\ConfirmPurchaseAction;
use App\Http\Requests\Purchase\PurchasePaymentRequest;
use App\Models\Purchase;
use Illuminate\Http\RedirectResponse;

class PurchaseConfirmController extends Controller
{
    /**
     * "Status Update" ordered/draft → received — the point stock and the
     * supplier's ledger actually move, with an optional payment collected
     * at the same time.
     */
    public function store(PurchasePaymentRequest $request, Purchase $purchase, ConfirmPurchaseAction $confirmPurchase): RedirectResponse
    {
        if (! $purchase->canEdit()) {
            return back()->withErrors(['purchase' => 'This purchase has already been received.']);
        }

        $data = $request->validated();

        $confirmPurchase->execute($purchase, $data['payments'] ?? [], (float) ($data['credit_applied'] ?? 0));

        return back();
    }
}
