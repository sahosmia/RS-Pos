<?php

use App\Http\Controllers\OtherIncome\OtherIncomeCategoryController;
use App\Http\Controllers\OtherIncome\OtherIncomeController;
use App\Http\Controllers\OtherIncome\OtherIncomeExportController;
use Illuminate\Support\Facades\Route;

// Reuses the Expense permissions — this is the "money in" twin of the Expense module.
Route::middleware(['auth', 'module:expense'])->group(function () {
    Route::get('other-income/export', OtherIncomeExportController::class)->name('other-income.export');

    Route::resource('other-income', OtherIncomeController::class)
        ->parameters(['other-income' => 'otherIncome'])
        ->only(['index', 'store', 'destroy']);

    Route::resource('other-income-categories', OtherIncomeCategoryController::class)
        ->parameters(['other-income-categories' => 'category'])
        ->only(['store', 'update', 'destroy']);
});
