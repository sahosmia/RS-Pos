<?php

use App\Http\Controllers\PurchaseConfirmController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchasePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::get('purchases/create', [PurchaseController::class, 'create'])->name('purchases.create');
    Route::post('purchases', [PurchaseController::class, 'store'])->name('purchases.store');
    Route::get('purchases/{purchase}', [PurchaseController::class, 'show'])->name('purchases.show');
    Route::get('purchases/{purchase}/edit', [PurchaseController::class, 'edit'])->name('purchases.edit');
    Route::patch('purchases/{purchase}', [PurchaseController::class, 'update'])->name('purchases.update');
    Route::delete('purchases/{purchase}', [PurchaseController::class, 'destroy'])->name('purchases.destroy');

    Route::post('purchases/{purchase}/confirm', [PurchaseConfirmController::class, 'store'])->name('purchases.confirm');
    Route::post('purchases/{purchase}/payments', [PurchasePaymentController::class, 'store'])->name('purchases.payments.store');
});
