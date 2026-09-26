<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\PurchaseReturn\RefundPurchaseReturnAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchases\PurchaseReturn\RefundPurchaseReturnRequest;
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
