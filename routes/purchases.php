<?php

use App\Http\Controllers\PurchaseConfirmController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchasePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // 'create' must stay ahead of the {purchase} wildcard below, or it'd be
    // swallowed as an id.
    Route::prefix('purchases')
        ->name('purchases.')
        ->controller(PurchaseController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{purchase}', 'show')->name('show');
            Route::get('/{purchase}/edit', 'edit')->name('edit');
            Route::patch('/{purchase}', 'update')->name('update');
            Route::delete('/{purchase}', 'destroy')->name('destroy');
        });

    Route::prefix('purchases/{purchase}')
        ->name('purchases.')
        ->group(function () {
            Route::post('confirm', [PurchaseConfirmController::class, 'store'])->name('confirm');
            Route::post('payments', [PurchasePaymentController::class, 'store'])->name('payments.store');
        });
});
