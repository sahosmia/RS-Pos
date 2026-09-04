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
    // the resource's {contact} show route below, or they'd be swallowed as
    // an id.
    Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
    Route::post('contacts/bulk-delete', [ContactController::class, 'bulkDestroy'])->name('contacts.bulk-delete');

    Route::resource('contacts', ContactController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

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
