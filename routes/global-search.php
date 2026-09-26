<?php

use App\Http\Controllers\GlobalSearchController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->get('global-search', GlobalSearchController::class)->name('global-search');
