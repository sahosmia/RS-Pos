<?php

use App\Http\Controllers\OtherLiabilities\OtherLiabilityController;
use App\Http\Controllers\OtherLiabilities\OtherLiabilityExportController;
use App\Http\Controllers\OtherLiabilities\OtherLiabilityTransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:asset'])->group(function () {
    // Registered before the resource route — `other-liabilities.show` (GET other-liabilities/{other_liability})
    // exists here, so `export` would otherwise route-model-bind as a `{other_liability}` id.
    Route::get('other-liabilities/export', OtherLiabilityExportController::class)->name('other-liabilities.export');

    Route::resource('other-liabilities', OtherLiabilityController::class)
        ->only(['index', 'store', 'update', 'show', 'destroy']);

    Route::post('other-liabilities/{other_liability}/transactions', [OtherLiabilityTransactionController::class, 'store'])
        ->name('other-liabilities.transactions.store');
});
