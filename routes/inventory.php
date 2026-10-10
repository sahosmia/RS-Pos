<?php

use App\Http\Controllers\Products\BrandController;
use App\Http\Controllers\Products\CategoryController;
use App\Http\Controllers\Products\ProductController;
use App\Http\Controllers\Products\ProductExportController;
use App\Http\Controllers\Products\ProductSearchController;
use App\Http\Controllers\Products\StockAdjustmentController;
use App\Http\Controllers\Products\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:product'])->group(function () {
    Route::resource('categories', CategoryController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('units', UnitController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('brands', BrandController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('products/export', ProductExportController::class)->name('products.export');
    Route::get('products/search', ProductSearchController::class)->name('products.search');

    Route::resource('products', ProductController::class);

    Route::get('products/{product}/in-stock-serials', [StockAdjustmentController::class, 'serials'])->name('products.in-stock-serials');
    Route::post('products/{product}/stock-adjustments', [StockAdjustmentController::class, 'store'])
        ->name('stock-adjustments.store');
});

// Its own group: inside the module's group a POST would also demand the "create" permission.
Route::middleware(['auth', 'module:product,delete'])
    ->post('products/bulk-delete', [ProductController::class, 'bulkDestroy'])
    ->name('products.bulk-delete');
