<?php

use App\Http\Controllers\ChartOfAccountController;
use App\Http\Controllers\GeneralLedgerController;
use App\Http\Controllers\JournalEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('chart-of-accounts', ChartOfAccountController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('chart-of-accounts/{chart_of_account}/ledger', GeneralLedgerController::class)
        ->name('chart-of-accounts.ledger');

    Route::resource('journal-entries', JournalEntryController::class)
        ->only(['index', 'show']);
});
