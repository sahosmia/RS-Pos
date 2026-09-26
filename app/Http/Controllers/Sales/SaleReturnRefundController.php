<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\SaleReturn\RefundSaleReturnAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\SaleReturn\RefundSaleReturnRequest;
use App\Models\SaleReturn;
use Illuminate\Http\RedirectResponse;

class SaleReturnRefundController extends Controller
{
    public function store(RefundSaleReturnRequest $request, SaleReturn $saleReturn, RefundSaleReturnAction $refund): RedirectResponse
    {
        $refund->execute($saleReturn, $request->validated('payments'));

        return back();
    }
}
