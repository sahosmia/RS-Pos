<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Support\SalePaymentHistory;
use Illuminate\Http\JsonResponse;

class SalePaymentHistoryController extends Controller
{
    public function __invoke(Sale $sale): JsonResponse
    {
        return response()->json(['payments' => SalePaymentHistory::forSale($sale)]);
    }
}
