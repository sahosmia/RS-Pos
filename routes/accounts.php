<?php

use App\Http\Controllers\Accounting\AccountController;
use App\Http\Controllers\Accounting\AccountStatementController;
use App\Http\Controllers\Accounting\AccountTypeController;
use App\Http\Controllers\Accounting\FundTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:account'])->group(function () {
    Route::resource('accounts', AccountController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('accounts/{account}/statement', AccountStatementController::class)
        ->name('accounts.statement');

    Route::resource('account-types', AccountTypeController::class)
        ->only(['store', 'update', 'destroy']);
});

Route::middleware(['auth', 'module:account,transfer'])
    ->post('fund-transfers', [FundTransferController::class, 'store'])->name('fund-transfers.store');
