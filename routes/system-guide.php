<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::inertia('system-guide', 'system-guide/index')->name('system-guide.index');
});
