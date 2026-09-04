<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactDocumentController;
use App\Http\Controllers\ContactDueWaiverController;
use App\Http\Controllers\ContactPaymentController;
use App\Http\Controllers\ContactRecentSalesController;
use App\Http\Controllers\CustomerGroupController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('customer-groups', CustomerGroupController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Static/custom contact routes (export, bulk-delete) must stay ahead of
    // the {contact} wildcard below, or they'd be swallowed as an id.
    Route::prefix('contacts')
        ->name('contacts.')
        ->controller(ContactController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/export', 'export')->name('export');
            Route::post('/', 'store')->name('store');
            Route::post('/bulk-delete', 'bulkDestroy')->name('bulk-delete');
            Route::get('/{contact}', 'show')->name('show');
            Route::patch('/{contact}', 'update')->name('update');
            Route::delete('/{contact}', 'destroy')->name('destroy');
        });

    Route::prefix('contacts/{contact}')
        ->name('contacts.')
        ->group(function () {
            Route::post('payments', [ContactPaymentController::class, 'store'])->name('payments.store');
            Route::post('due-waivers', [ContactDueWaiverController::class, 'store'])->name('due-waivers.store');
            Route::get('recent-sales', ContactRecentSalesController::class)->name('recent-sales');

            Route::post('documents', [ContactDocumentController::class, 'store'])->name('documents.store');
            Route::delete('documents/{media}', [ContactDocumentController::class, 'destroy'])->name('documents.destroy');
        });
});
