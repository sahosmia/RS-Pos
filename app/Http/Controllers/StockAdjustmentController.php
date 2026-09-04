<?php

namespace App\Http\Controllers;

use App\Actions\Product\AdjustStockAction;
use App\Http\Requests\Product\StoreStockAdjustmentRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;

class StockAdjustmentController extends Controller
{
    /**
     * Correct a product's stock to a counted quantity — the only route for
     * fixing stock once movements exist.
     */
    public function store(StoreStockAdjustmentRequest $request, Product $product, AdjustStockAction $adjustStock): RedirectResponse
    {
        $data = $request->validated();

        $adjustStock->execute($product, (float) $data['quantity'], $data['reason'] ?? null);

        return back();
    }
}
