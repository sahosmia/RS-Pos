<?php

use App\Http\Controllers\Purchases\PurchaseConfirmController;
use App\Http\Controllers\Purchases\PurchaseController;
use App\Http\Controllers\Purchases\PurchaseExportController;
use App\Http\Controllers\Purchases\PurchasePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:purchase'])->group(function () {
    // Registered before the resource route — `purchases.show` (GET purchases/{purchase}) exists
    // here, so `export` would otherwise route-model-bind as a `{purchase}` id.
    Route::get('purchases/export', PurchaseExportController::class)->name('purchases.export');

    Route::resource('purchases', PurchaseController::class);

    Route::prefix('purchases/{purchase}')
        ->name('purchases.')
        ->group(function () {
            Route::post('confirm', [PurchaseConfirmController::class, 'store'])->name('confirm');
            Route::post('payments', [PurchasePaymentController::class, 'store'])->name('payments.store');
        });
});
