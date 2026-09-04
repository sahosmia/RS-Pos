<?php

namespace App\Http\Controllers;

use App\Actions\Sale\ConfirmSaleAction;
use App\Http\Requests\Sale\SalePaymentRequest;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;

class SaleConfirmController extends Controller
{
    /**
     * Draft/Quotation → Confirmed — the point stock and the customer's
     * ledger actually move, with an optional payment collected at the
     * same time.
     */
    public function store(SalePaymentRequest $request, Sale $sale, ConfirmSaleAction $confirmSale): RedirectResponse
    {
        if (! $sale->canEdit()) {
            return back()->withErrors(['sale' => 'This sale has already been confirmed.']);
        }

        $confirmSale->execute($sale, $request->validated('payments') ?? []);

        return back();
    }
}
