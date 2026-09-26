<?php

use App\Http\Controllers\Accounting\AccountingPeriodController;
use App\Http\Controllers\Accounting\ChartOfAccountController;
use App\Http\Controllers\Accounting\GeneralLedgerController;
use App\Http\Controllers\Accounting\JournalEntryController;
use App\Http\Controllers\Accounting\JournalEntryExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:accounting'])->group(function () {
    Route::resource('chart-of-accounts', ChartOfAccountController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('chart-of-accounts/{chart_of_account}/ledger', GeneralLedgerController::class)
        ->name('chart-of-accounts.ledger');

    // Registered before the resource route — `journal-entries.show` (GET
    // journal-entries/{journal_entry}) exists here, so `export` would
    // otherwise route-model-bind as a `{journal_entry}` id.
    Route::get('journal-entries/export', JournalEntryExportController::class)->name('journal-entries.export');

    Route::resource('journal-entries', JournalEntryController::class)
        ->only(['index', 'show']);

    Route::resource('accounting-periods', AccountingPeriodController::class)
        ->only(['index']);

    Route::patch('accounting-periods/{accounting_period}/close', [AccountingPeriodController::class, 'close'])
        ->name('accounting-periods.close');
});

Route::middleware(['auth', 'module:accounting,edit'])
    ->post('journal-entries/{journal_entry}/reverse', [JournalEntryController::class, 'reverse'])->name('journal-entries.reverse');
