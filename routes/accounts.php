<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountStatementController;
use App\Http\Controllers\CashBookController;
use App\Http\Controllers\FundTransferController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
    Route::post('accounts', [AccountController::class, 'store'])->name('accounts.store');
    Route::patch('accounts/{account}', [AccountController::class, 'update'])->name('accounts.update');
    Route::delete('accounts/{account}', [AccountController::class, 'destroy'])->name('accounts.destroy');
    Route::get('accounts/{account}/statement', AccountStatementController::class)->name('accounts.statement');

    Route::post('fund-transfers', [FundTransferController::class, 'store'])->name('fund-transfers.store');

    Route::get('cash-book', [CashBookController::class, 'index'])->name('cash-book.index');
    Route::post('cash-book', [CashBookController::class, 'store'])->name('cash-book.store');
});
