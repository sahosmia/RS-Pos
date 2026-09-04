<?php

namespace App\Http\Controllers;

use App\Actions\Sale\CancelSaleAction;
use App\Enums\SaleStatus;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;

class SaleCancelController extends Controller
{
    /**
     * "Undo" — reverses a Confirmed sale via compensating entries. Not
     * time-limited server-side; the 30-second window is a UI affordance.
     */
    public function store(Sale $sale, CancelSaleAction $cancelSale): RedirectResponse
    {
        if ($sale->status !== SaleStatus::Confirmed) {
            return back()->withErrors(['sale' => 'Only a confirmed sale can be cancelled.']);
        }

        $cancelSale->execute($sale);

        return back();
    }
}
