<?php

use App\Http\Controllers\CompanyLoans\CompanyLoanController;
use App\Http\Controllers\CompanyLoans\CompanyLoanExportController;
use App\Http\Controllers\CompanyLoans\LoanTransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:finance'])->group(function () {
    // Registered before the resource route — `company-loans.show` (GET company-loans/{company_loan})
    // is included below, so `export` would otherwise route-model-bind as a `{company_loan}` id.
    Route::get('company-loans/export', CompanyLoanExportController::class)->name('company-loans.export');

    Route::resource('company-loans', CompanyLoanController::class)
        ->only(['index', 'store', 'update', 'show', 'destroy']);

    Route::post('company-loans/{company_loan}/transactions', [LoanTransactionController::class, 'store'])
        ->name('company-loans.transactions.store');
});
