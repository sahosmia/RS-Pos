<?php

use App\Enums\ThemeColor;
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
            'pagination_per_page_options' => [20, 30, 50, 100],
            'pagination_default_per_page' => 30,
            'pagination_allow_all' => true,
            'activity_log_retention_months' => 12,
            'theme_color' => 'blue',
        ])
        ->assertRedirect('/business-settings');

    expect($settings->fresh())
        ->shop_name->toBe('Updated Shop Name')
        ->invoice_next_number->toBe(5)
        ->thermal_printer_enabled->toBeTrue()
        ->emi_module_enabled->toBeTrue()
        ->serial_number_module_enabled->toBeFalse()
        ->pagination_per_page_options->toBe([20, 30, 50, 100])
        ->pagination_default_per_page->toBe(30)
        ->pagination_allow_all->toBeTrue()
        ->activity_log_retention_months->toBe(12)
        ->theme_color->toBe(ThemeColor::Blue)
        ->updated_by->toBe($user->id);
});

test('sidebar menu order can be saved and is shared with every page', function () {
    $settings = Settings::factory()->create();
    $user = User::factory()->create();
    $order = ['top' => ['products', 'sales'], 'sub' => ['sales' => ['add_sale', 'sales']]];

    $this->actingAs($user)
        ->patch('/business-settings', validBusinessSettingsPayload(['menu_order' => $order]))
        ->assertRedirect('/business-settings');

    expect($settings->fresh()->menu_order)->toBe($order);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('shop.menu_order', $order));
});

test('sidebar menu order rejects malformed input', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', validBusinessSettingsPayload(['menu_order' => ['top' => 'sales']]))
        ->assertSessionHasErrors('menu_order.top');

    $this->patch('/business-settings', validBusinessSettingsPayload(['menu_order' => ['top' => ['a', 'a']]]))
        ->assertSessionHasErrors('menu_order.top.1');
});

test('shop name is required', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', ['shop_name' => ''])
        ->assertSessionHasErrors('shop_name');
});

test('default rows-per-page must be one of the configured options', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', validBusinessSettingsPayload([
        'pagination_per_page_options' => [20, 50],
        'pagination_default_per_page' => 30,
    ]))->assertSessionHasErrors('pagination_default_per_page');
});

test('rows-per-page options must be unique', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', validBusinessSettingsPayload([
        'pagination_per_page_options' => [20, 20, 50],
    ]))->assertSessionHasErrors('pagination_per_page_options.1');
});

/**
 * @return array<string, mixed>
 */
function validBusinessSettingsPayload(array $overrides = []): array
{
    return array_merge([
        'shop_name' => 'My Shop',
        'currency_symbol' => '৳',
        'invoice_prefix' => 'INV-',
        'invoice_next_number' => 1,
        'purchase_prefix' => 'PUR-',
        'purchase_next_number' => 1,
        'fiscal_year_start_month' => 7,
        'thermal_printer_enabled' => false,
        'emi_module_enabled' => false,
        'serial_number_module_enabled' => false,
        'pagination_per_page_options' => [20, 30, 50, 100],
        'pagination_default_per_page' => 20,
        'pagination_allow_all' => true,
        'activity_log_retention_months' => 18,
        'theme_color' => 'neutral',
    ], $overrides);
}

test('generateInvoiceNumber formats and reserves the next number', function () {
    $settings = Settings::factory()->create(['invoice_prefix' => 'INV-', 'invoice_next_number' => 1]);

    expect($settings->generateInvoiceNumber())->toBe('INV-0001')
        ->and($settings->generateInvoiceNumber())->toBe('INV-0002')
        ->and($settings->fresh()->invoice_next_number)->toBe(3);
});
