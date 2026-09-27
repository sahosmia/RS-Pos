<?php

use App\Http\Controllers\Contacts\BillDiscountController;
use App\Http\Controllers\Contacts\BillPayController;
use App\Http\Controllers\Contacts\BillReceiveController;
use App\Http\Controllers\Contacts\ContactController;
use App\Http\Controllers\Contacts\ContactDocumentController;
use App\Http\Controllers\Contacts\ContactDueWaiverController;
use App\Http\Controllers\Contacts\ContactLedgerExportController;
use App\Http\Controllers\Contacts\ContactNotificationController;
use App\Http\Controllers\Contacts\ContactPaymentController;
use App\Http\Controllers\Contacts\ContactRecentSalesController;
use App\Http\Controllers\Contacts\ContactSearchController;
use App\Http\Controllers\Contacts\ContactToggleActiveController;
use App\Http\Controllers\Contacts\CustomerGroupController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:contact'])->group(function () {
    Route::resource('customer-groups', CustomerGroupController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Static/custom contact routes (export, bulk-delete, send-notification)
    // must stay ahead of the resource's {contact} show route below, or
    // they'd be swallowed as an id.
    Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
    Route::get('contacts/search', ContactSearchController::class)->name('contacts.search');
    Route::post('contacts/send-notification', [ContactNotificationController::class, 'store'])->name('contacts.send-notification');

    Route::resource('contacts', ContactController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::prefix('contacts/{contact}')
        ->name('contacts.')
        ->group(function () {
            Route::get('recent-sales', ContactRecentSalesController::class)->name('recent-sales');
            Route::post('toggle-active', [ContactToggleActiveController::class, 'store'])->name('toggle-active');
            Route::get('ledger/export', ContactLedgerExportController::class)->name('ledger.export');

            Route::post('documents', [ContactDocumentController::class, 'store'])->name('documents.store');
            Route::delete('documents/{media}', [ContactDocumentController::class, 'destroy'])->name('documents.destroy');
        });
});

// One-off actions gated by their own permission rather than the method-derived one.
Route::middleware(['auth', 'module:contact,payment'])
    ->prefix('contacts/{contact}')
    ->name('contacts.')
    ->group(function () {
        Route::post('payments', [ContactPaymentController::class, 'store'])->name('payments.store');
        Route::post('due-waivers', [ContactDueWaiverController::class, 'store'])->name('due-waivers.store');
    });

// Sidebar "Bills" menu — the same one-off actions above, just contact-first
// (search, then settle) instead of already being on that contact's page.
Route::middleware(['auth', 'module:contact,payment'])
    ->prefix('bills')
    ->name('bills.')
    ->group(function () {
        Route::get('receive', BillReceiveController::class)->name('receive');
        Route::get('pay', BillPayController::class)->name('pay');
        Route::get('discount', BillDiscountController::class)->name('discount');
    });

Route::middleware(['auth', 'module:contact,delete'])
    ->post('contacts/bulk-delete', [ContactController::class, 'bulkDestroy'])->name('contacts.bulk-delete');
