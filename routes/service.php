<?php

use App\Http\Controllers\Products\ServiceRequestController;
use App\Http\Controllers\Products\ServiceRequestExportController;
use App\Http\Controllers\Products\WarrantyClaimController;
use App\Http\Controllers\Products\WarrantyClaimExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:service'])->group(function () {
    // Registered before the resource routes — neither resource exposes a GET
    // {id} show route today, but keeping export first matches the convention
    // used everywhere else so it never silently breaks if one is added later.
    Route::get('service-requests/export', ServiceRequestExportController::class)->name('service-requests.export');
    Route::get('warranty-claims/export', WarrantyClaimExportController::class)->name('warranty-claims.export');

    // Before the resource, so "lookup" is never taken for a request id.
    Route::get('service-requests/lookup', [ServiceRequestController::class, 'lookup'])->name('service-requests.lookup');

    Route::resource('service-requests', ServiceRequestController::class)
        ->only(['index', 'create', 'store', 'update']);

    Route::resource('warranty-claims', WarrantyClaimController::class)
        ->only(['index', 'store', 'update']);
});
