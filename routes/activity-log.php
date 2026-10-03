<?php

use App\Http\Controllers\ActivityLog\ActivityLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:activity_log'])->group(function () {
    Route::get('activity-log', ActivityLogController::class)->name('activity-log.index');
});
