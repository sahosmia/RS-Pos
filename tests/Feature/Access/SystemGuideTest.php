<?php

use App\Models\Settings;

test('any signed-in user can open the system guide', function () {
    $this->actingAs(userWithPermissions(['product.view']))
        ->get('/system-guide')
        ->assertOk();
});

test('guests are redirected away from the system guide', function () {
    $this->get('/system-guide')->assertRedirect();
});

test('the new quick action keys are accepted by the settings whitelist', function () {
    expect(Settings::QUICK_ACTION_KEYS)->toContain('add_service', 'add_sale_return', 'add_purchase_return');
});
