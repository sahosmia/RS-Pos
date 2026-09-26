<?php

use App\Http\Controllers\Assets\AssetController;
use App\Http\Controllers\Assets\AssetExportController;
use App\Http\Controllers\Assets\AssetTransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:asset'])->group(function () {
    // Registered before the resource route — `assets.show` (GET assets/{asset}) exists here,
    // so `export` would otherwise route-model-bind as a `{asset}` id.
    Route::get('assets/export', AssetExportController::class)->name('assets.export');

    Route::resource('assets', AssetController::class)
        ->only(['index', 'store', 'update', 'show', 'destroy']);

    Route::post('assets/{asset}/transactions', [AssetTransactionController::class, 'store'])
        ->name('assets.transactions.store');
});
