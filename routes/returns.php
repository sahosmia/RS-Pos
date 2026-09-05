<?php

use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\PurchaseReturnRefundController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\SaleReturnRefundController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('sale-returns', SaleReturnController::class)
        ->only(['index', 'create', 'store', 'show']);

    Route::post('sale-returns/{sale_return}/refund', [SaleReturnRefundController::class, 'store'])
        ->name('sale-returns.refund');

    Route::resource('purchase-returns', PurchaseReturnController::class)
        ->only(['index', 'create', 'store', 'show']);

    Route::post('purchase-returns/{purchase_return}/refund', [PurchaseReturnRefundController::class, 'store'])
        ->name('purchase-returns.refund');
});
