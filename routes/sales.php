<?php

use App\Http\Controllers\SaleCancelController;
use App\Http\Controllers\SaleConfirmController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('sales', SaleController::class);

    Route::prefix('sales/{sale}')
        ->name('sales.')
        ->group(function () {
            Route::post('confirm', [SaleConfirmController::class, 'store'])->name('confirm');
            Route::post('cancel', [SaleCancelController::class, 'store'])->name('cancel');
            Route::post('payments', [SalePaymentController::class, 'store'])->name('payments.store');
        });
});
