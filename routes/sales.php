<?php

use App\Http\Controllers\SaleCancelController;
use App\Http\Controllers\SaleConfirmController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // 'create' must stay ahead of the {sale} wildcard below, or it'd be
    // swallowed as an id.
    Route::prefix('sales')
        ->name('sales.')
        ->controller(SaleController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{sale}', 'show')->name('show');
            Route::get('/{sale}/edit', 'edit')->name('edit');
            Route::patch('/{sale}', 'update')->name('update');
            Route::delete('/{sale}', 'destroy')->name('destroy');
        });

    Route::prefix('sales/{sale}')
        ->name('sales.')
        ->group(function () {
            Route::post('confirm', [SaleConfirmController::class, 'store'])->name('confirm');
            Route::post('cancel', [SaleCancelController::class, 'store'])->name('cancel');
            Route::post('payments', [SalePaymentController::class, 'store'])->name('payments.store');
        });
});
