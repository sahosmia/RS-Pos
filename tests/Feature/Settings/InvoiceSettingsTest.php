<?php

use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('guests are redirected to the login page', function () {
    $this->get('/invoice-settings')->assertRedirect('/login');
});

test('a fresh install sees the default invoice settings', function () {
    Settings::factory()->create(['invoice_settings' => null]);
    $this->actingAs(User::factory()->create());

    $this->get('/invoice-settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('invoice-settings/index')
            ->where('settings.general.title', 'INVOICE')
            ->where('settings.branding.show_logo', true)
            ->where('settings.items.show_sku', true));
});

test('invoice settings can be updated', function () {
    $settings = Settings::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/invoice-settings', validInvoiceSettingsPayload([
            'general' => ['title' => 'TAX INVOICE', 'subtitle' => 'Sales Invoice', 'show_number' => true, 'show_date' => true, 'show_due_date' => false],
            'items' => ['show_sku' => false, 'show_unit' => true, 'show_discount' => true],
        ]))
        ->assertRedirect('/invoice-settings');

    $fresh = $settings->fresh()->invoiceSettingsOrDefault();

    expect($fresh['general']['title'])->toBe('TAX INVOICE')
        ->and($fresh['general']['show_due_date'])->toBeFalse()
        ->and($fresh['items']['show_sku'])->toBeFalse()
        ->and($settings->fresh()->updated_by)->toBe($user->id);
});

test('a saved section only overrides its own fields, others keep defaults', function () {
    $settings = Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/invoice-settings', validInvoiceSettingsPayload([
        'footer' => ['enabled' => false, 'text' => ''],
    ]));

    $fresh = $settings->fresh()->invoiceSettingsOrDefault();

    expect($fresh['footer']['enabled'])->toBeFalse()
        ->and($fresh['business']['show_name'])->toBeTrue();
});

test('logo upload lands in the invoice_logo media collection', function () {
    Storage::fake('public');
    $settings = Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $payload = validInvoiceSettingsPayload();
    $payload['logo'] = UploadedFile::fake()->image('logo.png');

    $this->patch('/invoice-settings', $payload)->assertRedirect('/invoice-settings');

    expect($settings->fresh()->getFirstMediaUrl('invoice_logo'))->not->toBeEmpty();
});

test('invoice title is required', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $payload = validInvoiceSettingsPayload();
    $payload['general']['title'] = '';

    $this->patch('/invoice-settings', $payload)->assertSessionHasErrors('general.title');
});

/**
 * @return array<string, mixed>
 */
function validInvoiceSettingsPayload(array $overrides = []): array
{
    return array_replace_recursive(Settings::defaultInvoiceSettings(), $overrides);
}
