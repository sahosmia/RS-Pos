<?php

namespace App\Http\Controllers\Purchases;

use App\Actions\Purchases\Purchase\AdjustPurchaseCostAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchases\Purchase\AdjustPurchaseCostRequest;
use App\Models\Purchase;
use Illuminate\Http\RedirectResponse;

class PurchaseCostController extends Controller
{
    /**
     * Correct the price on a received purchase without touching its units — see AdjustPurchaseCostAction.
     */
    public function update(AdjustPurchaseCostRequest $request, Purchase $purchase, AdjustPurchaseCostAction $adjustCost): RedirectResponse
    {
        $prices = collect($request->validated('items'))->mapWithKeys(fn (array $row) => [(int) $row['id'] => $row['unit_price']])->all();

        $adjustCost->execute($purchase, $prices, $request->validated('reason'));

        return back();
    }
}
