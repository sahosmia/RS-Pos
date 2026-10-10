<?php

use App\Http\Controllers\Investors\InvestorController;
use App\Http\Controllers\Investors\InvestorExportController;
use App\Http\Controllers\Investors\InvestorTransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:finance'])->group(function () {
    // Registered before the resource route — `investors.show` (GET investors/{investor}) exists here,
    // unlike Products, so `export` would otherwise route-model-bind as a `{investor}` id.
    Route::get('investors/export', InvestorExportController::class)->name('investors.export');

    Route::resource('investors', InvestorController::class)
        ->only(['index', 'store', 'update', 'show', 'destroy']);

    Route::post('investors/{investor}/transactions', [InvestorTransactionController::class, 'store'])
        ->name('investors.transactions.store');
});

// Its own group: inside the module's group a POST would also demand the "create" permission.
Route::middleware(['auth', 'module:finance,delete'])
    ->post('investors/bulk-delete', [InvestorController::class, 'bulkDestroy'])
    ->name('investors.bulk-delete');
