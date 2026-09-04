<?php

use App\Http\Controllers\BusinessSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('business-settings', [BusinessSettingsController::class, 'edit'])->name('business-settings.edit');
    Route::patch('business-settings', [BusinessSettingsController::class, 'update'])->name('business-settings.update');
});
