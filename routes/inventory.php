<?php

use App\Http\Controllers\BrandController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('categories', CategoryController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('units', UnitController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('brands', BrandController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // No product detail/show page yet — only the list, create and edit forms.
    Route::resource('products', ProductController::class)
        ->except(['show']);

    Route::post('products/{product}/stock-adjustments', [StockAdjustmentController::class, 'store'])
        ->name('stock-adjustments.store');
});
