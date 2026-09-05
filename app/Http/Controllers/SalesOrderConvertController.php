<?php

namespace App\Http\Controllers;

use App\Actions\SalesOrder\ConvertSalesOrderToSaleAction;
use App\Http\Requests\SalesOrder\ConvertSalesOrderRequest;
use App\Models\SalesOrder;
use Illuminate\Http\RedirectResponse;

class SalesOrderConvertController extends Controller
{
    /**
     * Fulfils the order — creates and confirms a real Sale, with an
     * optional additional payment on top of the advance already taken.
     */
    public function store(ConvertSalesOrderRequest $request, SalesOrder $salesOrder, ConvertSalesOrderToSaleAction $convert): RedirectResponse
    {
        if (! $salesOrder->canConvert()) {
            return back()->withErrors(['sales_order' => 'This sales order can no longer be converted.']);
        }

        $sale = $convert->execute(
            $salesOrder,
            $request->validated('payments') ?? [],
            $request->validated('serial_numbers') ?? [],
        );

        return to_route('sales.show', $sale);
    }
}
