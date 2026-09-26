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
        $settings = Settings::current();

        return Inertia::render('business-settings/index', [
            'settings' => [
                ...$settings->toArray(),
                // Nullable until an admin saves their own list — resolve to the
                // fallback here so the "Rows per page" editor always has an array to render.
                'pagination_per_page_options' => $settings->paginationOptions(),
            ],
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
