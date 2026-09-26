<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\Purchase\AddPurchasePaymentAction;
use App\Enums\PurchaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchases\Purchase\PurchasePaymentRequest;
use App\Models\Purchase;
use Illuminate\Http\RedirectResponse;

class PurchasePaymentController extends Controller
{
    /**
     * Settles more of an already-Received purchase's due — separate from
     * confirming receipt.
     */
    public function store(PurchasePaymentRequest $request, Purchase $purchase, AddPurchasePaymentAction $addPayment): RedirectResponse
    {
        if ($purchase->status !== PurchaseStatus::Received) {
            return back()->withErrors(['purchase' => 'Only a received purchase can take a payment.']);
        }

        $data = $request->validated();

        $addPayment->execute($purchase, $data['payments'] ?? [], (float) ($data['credit_applied'] ?? 0));

        return back();
    }
}
