<?php

use App\Http\Controllers\PurchaseConfirmController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchasePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('purchases', PurchaseController::class);

    Route::prefix('purchases/{purchase}')
        ->name('purchases.')
        ->group(function () {
            Route::post('confirm', [PurchaseConfirmController::class, 'store'])->name('confirm');
            Route::post('payments', [PurchasePaymentController::class, 'store'])->name('payments.store');
        });
});
