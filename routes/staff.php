<?php

use App\Http\Controllers\Staff\StaffController;
use App\Http\Controllers\Staff\StaffTransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:staff'])->group(function () {
    Route::resource('staff', StaffController::class)
        ->only(['index', 'store', 'update', 'show', 'destroy']);

    Route::post('staff/{staff}/transactions', [StaffTransactionController::class, 'store'])
        ->name('staff.transactions.store');
});
