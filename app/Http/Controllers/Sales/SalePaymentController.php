<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\Sale\AddSalePaymentAction;
use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\Sale\AddSalePaymentRequest;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;

class SalePaymentController extends Controller
{
    /**
     * Settles more of an already-Confirmed sale's due — separate from
     * confirming it.
     */
    public function store(AddSalePaymentRequest $request, Sale $sale, AddSalePaymentAction $addPayment): RedirectResponse
    {
        if ($sale->status !== SaleStatus::Confirmed) {
            return back()->withErrors(['sale' => 'Only a confirmed sale can take a payment.']);
        }

        $addPayment->execute($sale, $request->validated('payments'));

        return back();
    }
}
