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

    // 'create' must stay ahead of the {product} wildcard below, or it'd be
    // swallowed as an id.
    Route::prefix('products')
        ->name('products.')
        ->controller(ProductController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{product}/edit', 'edit')->name('edit');
            Route::patch('/{product}', 'update')->name('update');
            Route::delete('/{product}', 'destroy')->name('destroy');
        });

    Route::post('products/{product}/stock-adjustments', [StockAdjustmentController::class, 'store'])
        ->name('stock-adjustments.store');
});
