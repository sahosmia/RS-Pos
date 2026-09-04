<?php

use App\Http\Controllers\SaleCancelController;
use App\Http\Controllers\SaleConfirmController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('sales', [SaleController::class, 'index'])->name('sales.index');
    Route::get('sales/create', [SaleController::class, 'create'])->name('sales.create');
    Route::post('sales', [SaleController::class, 'store'])->name('sales.store');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->name('sales.show');
    Route::get('sales/{sale}/edit', [SaleController::class, 'edit'])->name('sales.edit');
    Route::patch('sales/{sale}', [SaleController::class, 'update'])->name('sales.update');
    Route::delete('sales/{sale}', [SaleController::class, 'destroy'])->name('sales.destroy');

    Route::post('sales/{sale}/confirm', [SaleConfirmController::class, 'store'])->name('sales.confirm');
    Route::post('sales/{sale}/cancel', [SaleCancelController::class, 'store'])->name('sales.cancel');
    Route::post('sales/{sale}/payments', [SalePaymentController::class, 'store'])->name('sales.payments.store');
});
