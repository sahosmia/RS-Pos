<?php

use App\Http\Controllers\Sales\SalesOrderController;
use App\Http\Controllers\Sales\SalesOrderConvertController;
use App\Http\Controllers\Sales\SalesOrderExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:sale'])->group(function () {
    // Registered before the resource route — `sales-orders.show` (GET sales-orders/{salesOrder})
    // exists here, so `export` would otherwise route-model-bind as a `{salesOrder}` id.
    Route::get('sales-orders/export', SalesOrderExportController::class)->name('sales-orders.export');

    Route::resource('sales-orders', SalesOrderController::class)->only(['index', 'create', 'store', 'show']);

    Route::post('sales-orders/{salesOrder}/convert', [SalesOrderConvertController::class, 'store'])->name('sales-orders.convert');
});
