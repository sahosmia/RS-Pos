<?php

namespace App\Http\Controllers;

use App\Actions\SaleReturn\RefundSaleReturnAction;
use App\Http\Requests\SaleReturn\RefundSaleReturnRequest;
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
