<?php

namespace App\Http\Controllers\Products;

use App\Actions\Products\Product\AdjustStockAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\Product\StoreStockAdjustmentRequest;
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
