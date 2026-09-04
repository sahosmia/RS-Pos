<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountStatementController;
use App\Http\Controllers\CashBookController;
use App\Http\Controllers\FundTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('accounts', AccountController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('accounts/{account}/statement', AccountStatementController::class)
        ->name('accounts.statement');

    Route::post('fund-transfers', [FundTransferController::class, 'store'])
        ->name('fund-transfers.store');

    Route::resource('cash-book', CashBookController::class)
        ->only(['index', 'store']);
});
