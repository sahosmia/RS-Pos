<?php

use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\SalesOrderConvertController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('sales-orders', SalesOrderController::class)->only(['index', 'create', 'store', 'show']);

    Route::post('sales-orders/{salesOrder}/convert', [SalesOrderConvertController::class, 'store'])->name('sales-orders.convert');
});
