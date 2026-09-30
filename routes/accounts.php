<?php

use App\Http\Controllers\Accounting\AccountController;
use App\Http\Controllers\Accounting\AccountStatementController;
use App\Http\Controllers\Accounting\AccountTypeController;
use App\Http\Controllers\Accounting\CashBookController;
use App\Http\Controllers\Accounting\CashBookExportController;
use App\Http\Controllers\Accounting\FundTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:account'])->group(function () {
    Route::resource('accounts', AccountController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('accounts/{account}/statement', AccountStatementController::class)
        ->name('accounts.statement');

    Route::resource('account-types', AccountTypeController::class)
        ->only(['store', 'update', 'destroy']);

    // No `cash-book/{cash_book}` route exists (resource is index/store only),
    // so ordering doesn't matter here today — registered before the resource
    // anyway to match the convention every other export route follows.
    Route::get('cash-book/export', CashBookExportController::class)->name('cash-book.export');

    Route::resource('cash-book', CashBookController::class)
        ->only(['index', 'store']);
});

Route::middleware(['auth', 'module:account,transfer'])
    ->post('fund-transfers', [FundTransferController::class, 'store'])->name('fund-transfers.store');
