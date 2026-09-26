<?php

use App\Http\Controllers\ImportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:import'])->group(function () {
    Route::get('imports', [ImportController::class, 'index'])->name('imports.index');
    Route::post('imports/products', [ImportController::class, 'products'])->name('imports.products');
    Route::post('imports/contacts', [ImportController::class, 'contacts'])->name('imports.contacts');
    Route::post('imports/opening-stock', [ImportController::class, 'openingStock'])->name('imports.opening-stock');
    Route::post('imports/sales', [ImportController::class, 'sales'])->name('imports.sales');
});
