<?php

use App\Http\Controllers\Purchases\PurchaseCancelController;
use App\Http\Controllers\Purchases\PurchaseConfirmController;
use App\Http\Controllers\Purchases\PurchaseController;
use App\Http\Controllers\Purchases\PurchaseCostController;
use App\Http\Controllers\Purchases\PurchaseExportController;
use App\Http\Controllers\Purchases\PurchasePaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:purchase'])->group(function () {
    // Registered before the resource route — `purchases.show` (GET purchases/{purchase}) exists
    // here, so `export` would otherwise route-model-bind as a `{purchase}` id.
    Route::get('purchases/export', PurchaseExportController::class)->name('purchases.export');

    Route::resource('purchases', PurchaseController::class);

    Route::prefix('purchases/{purchase}')
        ->name('purchases.')
        ->group(function () {
            Route::post('confirm', [PurchaseConfirmController::class, 'store'])->name('confirm');
            Route::post('cancel', [PurchaseCancelController::class, 'store'])->name('cancel');
            Route::post('payments', [PurchasePaymentController::class, 'store'])->name('payments.store');
        });
});

// Its own group: inside the module's group a POST would also demand the "create" permission.
Route::middleware(['auth', 'module:purchase,delete'])
    ->post('purchases/bulk-delete', [PurchaseController::class, 'bulkDestroy'])
    ->name('purchases.bulk-delete');

// Correcting a price edits an existing purchase: the "edit" permission, not "create" (a PATCH inside the module's group would also ask for the module's own rules).
Route::middleware(['auth', 'module:purchase,edit'])
    ->patch('purchases/{purchase}/cost', [PurchaseCostController::class, 'update'])
    ->name('purchases.cost.update');
