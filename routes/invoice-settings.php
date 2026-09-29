<?php

use App\Http\Controllers\InvoiceSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:settings'])->group(function () {
    Route::get('invoice-settings', [InvoiceSettingsController::class, 'edit'])->name('invoice-settings.edit');
    Route::patch('invoice-settings', [InvoiceSettingsController::class, 'update'])->name('invoice-settings.update');
});
