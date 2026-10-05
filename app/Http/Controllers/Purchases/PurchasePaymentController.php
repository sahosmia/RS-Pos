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
     * Settles more of a purchase's due in any status but Cancelled (an Ordered
     * purchase can take an advance) — separate from confirming receipt.
     */
    public function store(PurchasePaymentRequest $request, Purchase $purchase, AddPurchasePaymentAction $addPayment): RedirectResponse
    {
        if ($purchase->status === PurchaseStatus::Cancelled) {
            return back()->withErrors(['purchase' => 'A cancelled purchase cannot take a payment.']);
        }

        $data = $request->validated();

        $addPayment->execute($purchase, $data['payments'] ?? [], (float) ($data['credit_applied'] ?? 0));

        return back();
    }
}
