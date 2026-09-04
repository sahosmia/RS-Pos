<?php

use App\Models\Settings;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/business-settings')->assertRedirect('/login');
});

test('authenticated users can view business settings', function () {
    Settings::factory()->create(['shop_name' => 'My Fridge Shop']);
    $this->actingAs(User::factory()->create());

    $this->get('/business-settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('business-settings/index')
            ->where('settings.shop_name', 'My Fridge Shop'));
});

test('business settings can be updated', function () {
    $settings = Settings::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/business-settings', [
            'shop_name' => 'Updated Shop Name',
            'shop_address' => 'Dhaka',
            'shop_phone' => '01700000000',
            'currency_symbol' => '৳',
            'invoice_prefix' => 'INV-',
            'invoice_next_number' => 5,
            'purchase_prefix' => 'PUR-',
            'purchase_next_number' => 3,
            'fiscal_year_start_month' => 1,
            'thermal_printer_enabled' => true,
            'emi_module_enabled' => true,
            'serial_number_module_enabled' => false,
        ])
        ->assertRedirect('/business-settings');

    expect($settings->fresh())
        ->shop_name->toBe('Updated Shop Name')
        ->invoice_next_number->toBe(5)
        ->thermal_printer_enabled->toBeTrue()
        ->emi_module_enabled->toBeTrue()
        ->serial_number_module_enabled->toBeFalse()
        ->updated_by->toBe($user->id);
});

test('shop name is required', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', ['shop_name' => ''])
        ->assertSessionHasErrors('shop_name');
});

test('generateInvoiceNumber formats and reserves the next number', function () {
    $settings = Settings::factory()->create(['invoice_prefix' => 'INV-', 'invoice_next_number' => 1]);

    expect($settings->generateInvoiceNumber())->toBe('INV-0001')
        ->and($settings->generateInvoiceNumber())->toBe('INV-0002')
        ->and($settings->fresh()->invoice_next_number)->toBe(3);
});
