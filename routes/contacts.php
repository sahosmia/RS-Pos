<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactDocumentController;
use App\Http\Controllers\ContactPaymentController;
use App\Http\Controllers\CustomerGroupController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('customer-groups', [CustomerGroupController::class, 'index'])->name('customer-groups.index');
    Route::post('customer-groups', [CustomerGroupController::class, 'store'])->name('customer-groups.store');
    Route::patch('customer-groups/{customer_group}', [CustomerGroupController::class, 'update'])->name('customer-groups.update');
    Route::delete('customer-groups/{customer_group}', [CustomerGroupController::class, 'destroy'])->name('customer-groups.destroy');

    Route::get('contacts', [ContactController::class, 'index'])->name('contacts.index');
    Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
    Route::post('contacts', [ContactController::class, 'store'])->name('contacts.store');
    Route::post('contacts/bulk-delete', [ContactController::class, 'bulkDestroy'])->name('contacts.bulk-delete');
    Route::get('contacts/{contact}', [ContactController::class, 'show'])->name('contacts.show');
    Route::patch('contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
    Route::delete('contacts/{contact}', [ContactController::class, 'destroy'])->name('contacts.destroy');

    Route::post('contacts/{contact}/payments', [ContactPaymentController::class, 'store'])->name('contacts.payments.store');

    Route::post('contacts/{contact}/documents', [ContactDocumentController::class, 'store'])->name('contacts.documents.store');
    Route::delete('contacts/{contact}/documents/{media}', [ContactDocumentController::class, 'destroy'])->name('contacts.documents.destroy');
});
