<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\Serial\CorrectSaleSerialAction;
use App\Actions\Sales\Serial\RestockReturnedSerialAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\Serial\SaleSerialRequest;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class SaleSerialController extends Controller
{
    /**
     * Swap the serial recorded on a sold line for the unit that was really sold.
     */
    public function update(SaleSerialRequest $request, Sale $sale, SaleItem $saleItem, CorrectSaleSerialAction $correct): RedirectResponse
    {
        $this->assertLineBelongsTo($sale, $saleItem);

        if (! $request->filled('to')) {
            throw ValidationException::withMessages(['serial' => ['Enter the serial number that was really sold.']]);
        }

        $correct->execute($saleItem, $request->validated('from'), $request->validated('to'));

        return back();
    }

    /**
     * Put a customer-returned unit back on the shelf so it can be sold again.
     */
    public function restock(SaleSerialRequest $request, Sale $sale, SaleItem $saleItem, RestockReturnedSerialAction $restock): RedirectResponse
    {
        $this->assertLineBelongsTo($sale, $saleItem);

        $restock->execute($saleItem, $request->validated('from'));

        return back();
    }

    private function assertLineBelongsTo(Sale $sale, SaleItem $saleItem): void
    {
        abort_unless($saleItem->sale_id === $sale->id, 404);
    }
}
