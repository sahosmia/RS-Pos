<?php

use App\Http\Controllers\BusinessSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:settings'])->group(function () {
    Route::get('business-settings', [BusinessSettingsController::class, 'edit'])->name('business-settings.edit');
    Route::patch('business-settings', [BusinessSettingsController::class, 'update'])->name('business-settings.update');
    Route::post('business-settings/sms/test', [BusinessSettingsController::class, 'testSms'])->name('business-settings.sms.test');

    // Branding images are uploaded on their own (not as part of the big settings form) so a file never has to
    // ride along with a PATCH. {slot} is one of the keys of Settings::BRANDING_SLOTS.
    Route::post('business-settings/branding/{slot}', [BusinessSettingsController::class, 'storeBranding'])
        ->where('slot', 'logo|logo-small|favicon')
        ->name('business-settings.branding.store');
    Route::delete('business-settings/branding/{slot}', [BusinessSettingsController::class, 'destroyBranding'])
        ->where('slot', 'logo|logo-small|favicon')
        ->name('business-settings.branding.destroy');
});
