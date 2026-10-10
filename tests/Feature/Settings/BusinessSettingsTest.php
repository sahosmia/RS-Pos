<?php

use App\Enums\ThemeColor;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

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

test('quick actions can be switched on or off and reordered, and are shared with every page', function () {
    $settings = Settings::factory()->create();
    $user = User::factory()->create();
    $actions = [
        ['key' => 'add_expense', 'enabled' => true],
        ['key' => 'add_sale', 'enabled' => true],
        ['key' => 'add_product', 'enabled' => false],
    ];

    $this->actingAs($user)
        ->patch('/business-settings', validBusinessSettingsPayload(['quick_actions' => $actions]))
        ->assertRedirect('/business-settings');

    expect($settings->fresh()->quick_actions)->toBe($actions);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('shop.quick_actions', $actions));
});

test('quick actions reject unknown keys, duplicates and missing flags', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', validBusinessSettingsPayload(['quick_actions' => [['key' => 'hack_the_planet', 'enabled' => true]]]))
        ->assertSessionHasErrors('quick_actions.0.key');

    $this->patch('/business-settings', validBusinessSettingsPayload(['quick_actions' => [
        ['key' => 'add_sale', 'enabled' => true],
        ['key' => 'add_sale', 'enabled' => false],
    ]]))->assertSessionHasErrors('quick_actions.1.key');

    $this->patch('/business-settings', validBusinessSettingsPayload(['quick_actions' => [['key' => 'add_sale']]]))
        ->assertSessionHasErrors('quick_actions.0.enabled');
});

test('quick actions default to null until an admin saves a list', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('shop.quick_actions', null));
});

test('each branding image can be uploaded, is shared with every page, and can be removed', function (string $slot, string $collection, string $sharedProp) {
    Storage::fake('public');
    $settings = Settings::factory()->create(['shop_name' => 'My Fridge Shop']);
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where("shop.{$sharedProp}", null));

    $this->post("/business-settings/branding/{$slot}", ['image' => UploadedFile::fake()->image('brand.png', 200, 80)])
        ->assertSessionHasNoErrors();

    expect($settings->fresh()->getMedia($collection))->toHaveCount(1);

    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where("shop.{$sharedProp}", fn ($url) => is_string($url) && $url !== ''));

    // A second upload replaces the first rather than piling up.
    $this->post("/business-settings/branding/{$slot}", ['image' => UploadedFile::fake()->image('new.jpg', 200, 80)])->assertSessionHasNoErrors();
    expect($settings->fresh()->getMedia($collection))->toHaveCount(1);

    $this->delete("/business-settings/branding/{$slot}")->assertSessionHasNoErrors();

    expect($settings->fresh()->getMedia($collection))->toHaveCount(0);
    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where("shop.{$sharedProp}", null));
})->with([
    'large logo' => ['logo', 'shop_logo', 'shop_logo_url'],
    'small logo' => ['logo-small', 'shop_logo_small', 'shop_logo_small_url'],
    'favicon' => ['favicon', 'favicon', 'favicon_url'],
]);

test('the three branding images are independent of each other', function () {
    Storage::fake('public');
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->post('/business-settings/branding/logo', ['image' => UploadedFile::fake()->image('big.png')])->assertSessionHasNoErrors();
    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->image('fav.png', 32, 32)])->assertSessionHasNoErrors();

    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('shop.shop_logo_url', fn ($url) => is_string($url) && $url !== '')
        ->where('shop.shop_logo_small_url', null)
        ->where('shop.favicon_url', fn ($url) => is_string($url) && $url !== ''));
});

test('logos must be a png, jpg or webp image under 2MB', function () {
    Storage::fake('public');
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    foreach (['logo', 'logo-small'] as $slot) {
        $this->post("/business-settings/branding/{$slot}", [])->assertSessionHasErrors('image');
        $this->post("/business-settings/branding/{$slot}", ['image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')])->assertSessionHasErrors('image');
        $this->post("/business-settings/branding/{$slot}", ['image' => UploadedFile::fake()->create('logo.svg', 10, 'image/svg+xml')])->assertSessionHasErrors('image');
        $this->post("/business-settings/branding/{$slot}", ['image' => UploadedFile::fake()->image('huge.png')->size(3000)])->assertSessionHasErrors('image');
    }
});

test('a favicon may be an .ico or small png but not an svg, a pdf or something large', function () {
    Storage::fake('public');
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->create('favicon.ico', 4, 'image/x-icon')])->assertSessionHasNoErrors();
    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->image('fav.png', 32, 32)])->assertSessionHasNoErrors();

    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->create('fav.svg', 4, 'image/svg+xml')])->assertSessionHasErrors('image');
    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->create('notes.pdf', 4, 'application/pdf')])->assertSessionHasErrors('image');
    $this->post('/business-settings/branding/favicon', ['image' => UploadedFile::fake()->image('big.png')->size(900)])->assertSessionHasErrors('image');
});

test('an unknown branding slot is a 404', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->post('/business-settings/branding/evil', ['image' => UploadedFile::fake()->image('x.png')])->assertNotFound();
});

test('the favicon is in the page head — including on the login page for guests', function () {
    Storage::fake('public');
    $settings = Settings::factory()->create();
    $settings->addMedia(UploadedFile::fake()->image('fav.png', 32, 32))->toMediaCollection('favicon');
    $url = $settings->fresh()->brandingUrls()['favicon'];

    $this->get('/login')->assertOk()->assertSee('<link rel="icon" href="'.$url.'">', false);
});

test('the login page shares the branding with guests', function () {
    Storage::fake('public');
    $settings = Settings::factory()->create(['shop_name' => 'My Fridge Shop']);
    $settings->addMedia(UploadedFile::fake()->image('big.png'))->toMediaCollection('shop_logo');

    $this->get('/login')->assertInertia(fn ($page) => $page
        ->where('shop.shop_name', 'My Fridge Shop')
        ->where('shop.shop_logo_url', fn ($url) => is_string($url) && $url !== ''));
});

test('sms settings are saved, the api key is encrypted and never sent to the page, and a blank key keeps the saved one', function () {
    $settings = Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $payload = fn (string $key) => [
        'shop_name' => 'Shop', 'currency_symbol' => '৳', 'invoice_prefix' => 'INV-', 'invoice_next_number' => 1,
        'purchase_prefix' => 'PUR-', 'purchase_next_number' => 1, 'fiscal_year_start_month' => 1,
        'thermal_printer_enabled' => false, 'emi_module_enabled' => false, 'serial_number_module_enabled' => false,
        'pagination_per_page_options' => [20], 'pagination_default_per_page' => 20, 'pagination_allow_all' => true,
        'activity_log_retention_months' => 12, 'theme_color' => 'blue',
        'sms_enabled' => true, 'sms_gateway_url' => 'https://sms.test/send', 'sms_api_key' => $key,
    ];

    $this->patch('/business-settings', $payload('secret-123'))->assertRedirect('/business-settings');

    expect($settings->fresh()->sms_api_key)->toBe('secret-123')
        ->and(DB::table('settings')->value('sms_api_key'))->not->toContain('secret-123');

    $this->patch('/business-settings', $payload(''))->assertRedirect('/business-settings');
    expect($settings->fresh()->sms_api_key)->toBe('secret-123');

    $this->get('/business-settings')->assertInertia(fn ($page) => $page
        ->where('settings.sms_api_key_set', true)
        ->missing('settings.sms_api_key'));
});

test('a gateway url is required once sms is switched on', function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());

    $this->patch('/business-settings', [
        'shop_name' => 'Shop', 'currency_symbol' => '৳', 'invoice_prefix' => 'INV-', 'invoice_next_number' => 1,
        'purchase_prefix' => 'PUR-', 'purchase_next_number' => 1, 'fiscal_year_start_month' => 1,
        'thermal_printer_enabled' => false, 'emi_module_enabled' => false, 'serial_number_module_enabled' => false,
        'pagination_per_page_options' => [20], 'pagination_default_per_page' => 20, 'pagination_allow_all' => true,
        'activity_log_retention_months' => 12, 'theme_color' => 'blue', 'sms_enabled' => true,
    ])->assertSessionHasErrors('sms_gateway_url');
});

test('a test sms is sent with the saved settings and a refusal is shown', function () {
    Settings::factory()->create(['sms_enabled' => true, 'sms_gateway_url' => 'https://sms.test/send', 'sms_api_key' => 'k', 'sms_api_key_param' => 'api_key']);
    $this->actingAs(User::factory()->create());

    Http::fake(['sms.test/*' => Http::sequence()->push('OK', 200)->push('Low balance', 402)]);
    $this->post('/business-settings/sms/test', ['phone' => '01712345678'])->assertSessionHasNoErrors();
    Http::assertSent(fn ($request) => $request['number'] === '8801712345678' && $request['api_key'] === 'k');

    $this->post('/business-settings/sms/test', ['phone' => '01712345678'])->assertSessionHasErrors('sms');
});
