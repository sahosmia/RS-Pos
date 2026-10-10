<?php

use App\Http\Controllers\ImportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:import'])->group(function () {
    Route::get('imports', [ImportController::class, 'index'])->name('imports.index');
    Route::get('imports/{type}/template', [ImportController::class, 'template'])
        ->whereIn('type', ['products', 'contacts', 'opening-stock', 'sales'])
        ->name('imports.template');
    // Two steps: preview (nothing saved) then confirm.
    Route::post('imports/{type}/preview', [ImportController::class, 'preview'])
        ->whereIn('type', ['products', 'contacts', 'opening-stock', 'sales'])
        ->name('imports.preview');
    Route::post('imports/{type}/confirm', [ImportController::class, 'confirm'])
        ->whereIn('type', ['products', 'contacts', 'opening-stock', 'sales'])
        ->name('imports.confirm');
    Route::delete('imports/preview/{token}', [ImportController::class, 'discard'])->name('imports.preview.discard');
    Route::post('imports/products', [ImportController::class, 'products'])->name('imports.products');
    Route::post('imports/contacts', [ImportController::class, 'contacts'])->name('imports.contacts');
    Route::post('imports/opening-stock', [ImportController::class, 'openingStock'])->name('imports.opening-stock');
    Route::post('imports/sales', [ImportController::class, 'sales'])->name('imports.sales');
});
