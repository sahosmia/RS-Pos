<?php

namespace App\Http\Controllers;

use App\Http\Requests\BusinessSettings\StoreBrandingImageRequest;
use App\Http\Requests\BusinessSettings\UpdateBusinessSettingsRequest;
use App\Models\Settings;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BusinessSettingsController extends Controller
{
    public function edit(): Response
    {
        $settings = Settings::current();

        return Inertia::render('business-settings/index', [
            'settings' => [
                ...$settings->toArray(),
                // Nullable until an admin saves their own list — resolve to the
                // fallback here so the "Rows per page" editor always has an array to render.
                'pagination_per_page_options' => $settings->paginationOptions(),
                ...$this->brandingProps($settings),
            ],
        ]);
    }

    public function storeBranding(StoreBrandingImageRequest $request, string $slot): RedirectResponse
    {
        // A `singleFile` collection: the new image replaces the old one.
        Settings::current()->addMediaFromRequest('image')->toMediaCollection(Settings::BRANDING_SLOTS[$slot]);

        return back();
    }

    public function destroyBranding(string $slot): RedirectResponse
    {
        Settings::current()->clearMediaCollection(Settings::BRANDING_SLOTS[$slot]);

        return back();
    }

    /**
     * @return array{shop_logo_url: ?string, shop_logo_small_url: ?string, favicon_url: ?string}
     */
    private function brandingProps(Settings $settings): array
    {
        $urls = $settings->brandingUrls();

        return [
            'shop_logo_url' => $urls['logo'],
            'shop_logo_small_url' => $urls['logo_small'],
            'favicon_url' => $urls['favicon'],
        ];
    }

    public function update(UpdateBusinessSettingsRequest $request): RedirectResponse
    {
        $settings = Settings::current();

        $settings->fill($request->validated());
        $settings->updated_by = $request->user()->id;
        $settings->save();

        return to_route('business-settings.edit');
    }
}
