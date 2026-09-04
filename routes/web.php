<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/business-settings.php';
require __DIR__.'/accounts.php';
require __DIR__.'/inventory.php';
require __DIR__.'/contacts.php';
require __DIR__.'/purchases.php';
require __DIR__.'/auth.php';
