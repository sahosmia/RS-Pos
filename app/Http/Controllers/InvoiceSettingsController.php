<?php

namespace App\Http\Controllers;

use App\Http\Requests\InvoiceSettings\UpdateInvoiceSettingsRequest;
use App\Models\Settings;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceSettingsController extends Controller
{
    public function edit(): Response
    {
        $settings = Settings::current();

        return Inertia::render('invoice-settings/index', [
            'settings' => $settings->invoiceSettingsOrDefault(),
            'logoUrl' => $settings->getFirstMediaUrl('invoice_logo') ?: null,
            'shop' => [
                'name' => $settings->shop_name,
                'address' => $settings->shop_address,
                'phone' => $settings->shop_phone,
            ],
        ]);
    }

    public function update(UpdateInvoiceSettingsRequest $request): RedirectResponse
    {
        $settings = Settings::current();

        $settings->invoice_settings = $request->safe()->except('logo');
        $settings->updated_by = $request->user()->id;
        $settings->save();

        if ($request->hasFile('logo')) {
            $settings->addMediaFromRequest('logo')->toMediaCollection('invoice_logo');
        }

        return to_route('invoice-settings.edit');
    }
}
