<?php

namespace App\Http\Controllers;

use App\Actions\PurchaseReturn\RefundPurchaseReturnAction;
use App\Http\Requests\PurchaseReturn\RefundPurchaseReturnRequest;
use App\Models\PurchaseReturn;
use Illuminate\Http\RedirectResponse;

class PurchaseReturnRefundController extends Controller
{
    public function store(RefundPurchaseReturnRequest $request, PurchaseReturn $purchaseReturn, RefundPurchaseReturnAction $refund): RedirectResponse
    {
        $refund->execute($purchaseReturn, $request->validated('payments'));

        return back();
    }
}
