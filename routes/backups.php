<?php

use App\Http\Controllers\BackupController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('backups', [BackupController::class, 'index'])->name('backups.index');
    Route::post('backups', [BackupController::class, 'store'])->name('backups.store');
    Route::post('backups/upload-restore', [BackupController::class, 'uploadRestore'])->name('backups.upload-restore');
    Route::get('backups/{filename}/download', [BackupController::class, 'download'])->name('backups.download');
    Route::post('backups/{filename}/restore', [BackupController::class, 'restore'])->name('backups.restore');
    Route::delete('backups/{filename}', [BackupController::class, 'destroy'])->name('backups.destroy');
});
