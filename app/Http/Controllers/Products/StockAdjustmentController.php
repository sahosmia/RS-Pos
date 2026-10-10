<?php

namespace App\Http\Controllers\Products;

use App\Actions\Products\Product\AdjustSerialStockAction;
use App\Actions\Products\Product\AdjustStockAction;
use App\Enums\SerialNumberStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\Product\StoreStockAdjustmentRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class StockAdjustmentController extends Controller
{
    /**
     * Correct a product's stock — the only route for fixing stock once movements exist. A normal product is set to a
     * counted quantity; a serial-tracked one is adjusted unit by unit (units gone / units found).
     */
    public function store(
        StoreStockAdjustmentRequest $request,
        Product $product,
        AdjustStockAction $adjustStock,
        AdjustSerialStockAction $adjustSerialStock,
    ): RedirectResponse {
        $data = $request->validated();

        if ($request->tracksSerials()) {
            $adjustSerialStock->execute(
                $product,
                $data['remove_serials'] ?? [],
                $data['add_serials'] ?? [],
                $data['reason'],
                isset($data['unit_cost']) ? (float) $data['unit_cost'] : null,
            );

            return back();
        }

        $adjustStock->execute(
            $product,
            (float) $data['quantity'],
            $data['reason'] ?? null,
            isset($data['unit_cost']) ? (float) $data['unit_cost'] : null,
        );

        return back();
    }

    /**
     * The serial numbers still in stock for a product — what the adjustment dialog lets you pick "gone" units from.
     */
    public function serials(Product $product): JsonResponse
    {
        return response()->json([
            'serials' => $product->serialNumbers()
                ->where('status', SerialNumberStatus::InStock)
                ->orderBy('serial_number')
                ->pluck('serial_number'),
        ]);
    }
}
