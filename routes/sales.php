<?php

use App\Http\Controllers\Sales\SaleCancelController;
use App\Http\Controllers\Sales\SaleConfirmController;
use App\Http\Controllers\Sales\SaleController;
use App\Http\Controllers\Sales\SaleExportController;
use App\Http\Controllers\Sales\SalePaymentController;
use App\Http\Controllers\Sales\SalePaymentHistoryController;
use App\Http\Controllers\Sales\SaleSerialController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:sale'])->group(function () {
    // Registered before the resource route — `sales.show` (GET sales/{sale}) exists here,
    // unlike Products, so `export` would otherwise route-model-bind as a `{sale}` id.
    Route::get('sales/export', SaleExportController::class)->name('sales.export');

    Route::resource('sales', SaleController::class);

    Route::prefix('sales/{sale}')
        ->name('sales.')
        ->group(function () {
            Route::post('confirm', [SaleConfirmController::class, 'store'])->name('confirm');
            Route::post('cancel', [SaleCancelController::class, 'store'])->name('cancel');
            Route::post('payments', [SalePaymentController::class, 'store'])->name('payments.store');
            Route::get('payments', SalePaymentHistoryController::class)->name('payments.index');
        });
});

// Its own group: inside the module's group a POST would also demand the "create" permission.
Route::middleware(['auth', 'module:sale,delete'])
    ->post('sales/bulk-delete', [SaleController::class, 'bulkDestroy'])
    ->name('sales.bulk-delete');

// Correcting a serial or putting a returned unit back in stock edits an existing sale: the "edit" permission,
// not "create" (a POST inside the module's group above would ask for that).
Route::middleware(['auth', 'module:sale,edit'])->prefix('sales/{sale}/items/{saleItem}/serials')->name('sales.serials.')->group(function () {
    Route::patch('/', [SaleSerialController::class, 'update'])->name('update');
    Route::post('restock', [SaleSerialController::class, 'restock'])->name('restock');
});
