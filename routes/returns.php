<?php

use App\Http\Controllers\Purchases\PurchaseReturnController;
use App\Http\Controllers\Purchases\PurchaseReturnExportController;
use App\Http\Controllers\Purchases\PurchaseReturnRefundController;
use App\Http\Controllers\Sales\SaleReturnController;
use App\Http\Controllers\Sales\SaleReturnExportController;
use App\Http\Controllers\Sales\SaleReturnRefundController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:sale'])->group(function () {
    // Registered before the resource route — `sale-returns.show` (GET sale-returns/{sale_return})
    // exists here, so `export` would otherwise route-model-bind as a `{sale_return}` id.
    Route::get('sale-returns/export', SaleReturnExportController::class)->name('sale-returns.export');

    Route::resource('sale-returns', SaleReturnController::class)
        ->only(['index', 'create', 'store', 'show']);

    Route::post('sale-returns/{sale_return}/refund', [SaleReturnRefundController::class, 'store'])
        ->name('sale-returns.refund');

    // Same reasoning as `sale-returns/export` above — `purchase-returns.show` exists too.
    Route::get('purchase-returns/export', PurchaseReturnExportController::class)->name('purchase-returns.export');

    Route::resource('purchase-returns', PurchaseReturnController::class)
        ->only(['index', 'create', 'store', 'show']);

    Route::post('purchase-returns/{purchase_return}/refund', [PurchaseReturnRefundController::class, 'store'])
        ->name('purchase-returns.refund');
});
