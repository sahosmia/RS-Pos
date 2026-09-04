<?php

namespace App\Http\Controllers;

use App\Http\Requests\BusinessSettings\UpdateBusinessSettingsRequest;
use App\Models\Settings;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BusinessSettingsController extends Controller
{
    /**
     * Show the shop's business settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('business-settings/index', [
            'settings' => Settings::current(),
        ]);
    }

    /**
     * Update the shop's business settings.
     */
    public function update(UpdateBusinessSettingsRequest $request): RedirectResponse
    {
        $settings = Settings::current();

        $settings->fill($request->validated());
        $settings->updated_by = $request->user()->id;
        $settings->save();

        return to_route('business-settings.edit');
    }
}
