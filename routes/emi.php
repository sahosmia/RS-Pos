<?php

use App\Http\Controllers\Sales\EmiCalculationController;
use App\Http\Controllers\Sales\EmiInstallmentController;
use App\Http\Controllers\Sales\EmiInstallmentExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:sale'])->group(function () {
    // Registered before the {emiInstallment} routes for consistency with the
    // other export endpoints, even though no GET route here binds an id today.
    Route::get('emi-installments/export', EmiInstallmentExportController::class)->name('emi-installments.export');

    // The Add Sale form's live preview. A GET: it is read-only, saves nothing, and so needs no CSRF token.
    Route::get('emi/calculate', EmiCalculationController::class)->name('emi.calculate');

    Route::get('emi-installments', [EmiInstallmentController::class, 'index'])->name('emi-installments.index');
    Route::post('emi-installments/{emiInstallment}/pay', [EmiInstallmentController::class, 'pay'])->name('emi-installments.pay');
});
