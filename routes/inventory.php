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

    // Registered before the resource group only for readability — no route conflict either way
    // since `products.show` (GET products/{product}) doesn't exist.
    Route::get('products/export', ProductExportController::class)->name('products.export');
    Route::get('products/search', ProductSearchController::class)->name('products.search');

    // No product detail/show page yet — only the list, create and edit forms.
    Route::resource('products', ProductController::class)
        ->except(['show']);

    Route::post('products/{product}/stock-adjustments', [StockAdjustmentController::class, 'store'])
        ->name('stock-adjustments.store');
});
