<?php

use App\Http\Controllers\Sales\SaleCancelController;
use App\Http\Controllers\Sales\SaleConfirmController;
use App\Http\Controllers\Sales\SaleController;
use App\Http\Controllers\Sales\SaleExportController;
use App\Http\Controllers\Sales\SalePaymentController;
use App\Http\Controllers\Sales\SalePaymentHistoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:sale'])->group(function () {
    // Registered before the resource route — `sales.show` (GET sales/{sale}) exists here,
    // unlike Products, so `export` would otherwise route-model-bind as a `{sale}` id.
    Route::get('sales/export', SaleExportController::class)->name('sales.export');

    Route::resource('sales', SaleController::class);

    Route::prefix('sales/{sale}')
        ->name('sales.')
        ->group(function () {
            Route::post('confirm', [SaleConfirmController::class, 'store'])->name('confirm');
            Route::post('cancel', [SaleCancelController::class, 'store'])->name('cancel');
            Route::post('payments', [SalePaymentController::class, 'store'])->name('payments.store');
            Route::get('payments', SalePaymentHistoryController::class)->name('payments.index');
        });
});
