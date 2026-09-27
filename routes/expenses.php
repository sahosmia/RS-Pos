<?php

use App\Http\Controllers\Expenses\ExpenseCategoryController;
use App\Http\Controllers\Expenses\ExpenseController;
use App\Http\Controllers\Expenses\ExpenseExportController;
use App\Http\Controllers\Expenses\ExpensePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:expense'])->group(function () {
    Route::resource('expense-categories', ExpenseCategoryController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // No `expenses.show` registered below, so no route-model-binding conflict either way.
    Route::get('expenses/export', ExpenseExportController::class)->name('expenses.export');

    Route::resource('expenses', ExpenseController::class)
        ->only(['index', 'store', 'update']);

    Route::post('expenses/{expense}/payments', [ExpensePaymentController::class, 'store'])
        ->name('expenses.payments.store');
});
