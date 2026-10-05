<?php

use App\Models\Product;

test('guests are redirected to the login page', function () {
    $this->get('/products/search?q=abc')->assertRedirect('/login');
});

test('it requires a non-empty query but no minimum length', function () {
    $this->actingAs(userWithPermissions(['product.view']));

    $this->getJson('/products/search')->assertJsonValidationErrors('q');
    $this->getJson('/products/search?q=')->assertJsonValidationErrors('q');
});

test('it matches by name, sku or barcode and returns a capped, mapped result', function () {
    $this->actingAs(userWithPermissions(['product.view']));

    $match = Product::factory()->create(['name' => 'Walton Refrigerator 300L', 'sku' => 'WAL-RF-300', 'barcode' => '8801234567890']);
    Product::factory()->create(['name' => 'Samsung LED TV', 'sku' => 'SAM-TV-43', 'barcode' => null]);

    $bySingleChar = $this->getJson('/products/search?q=W')->json('data');
    expect($bySingleChar)->toHaveCount(1)->and($bySingleChar[0]['id'])->toBe($match->id);

    $byName = $this->getJson('/products/search?q=Walton')->json('data');
    expect($byName)->toHaveCount(1)->and($byName[0]['id'])->toBe($match->id);

    $bySku = $this->getJson('/products/search?q=WAL-RF')->json('data');
    expect($bySku)->toHaveCount(1)->and($bySku[0]['id'])->toBe($match->id);

    $byBarcode = $this->getJson('/products/search?q=880123')->json('data');
    expect($byBarcode)->toHaveCount(1)->and($byBarcode[0]['id'])->toBe($match->id);

    $this->getJson('/products/search?q=nomatch999')->assertJson(['data' => []]);
});

test('it excludes inactive products', function () {
    $this->actingAs(userWithPermissions(['product.view']));

    Product::factory()->create(['name' => 'Retired Freezer', 'is_active' => false]);

    $this->getJson('/products/search?q=Retired')->assertJson(['data' => []]);
});

test('it requires product.view', function () {
    // Factory users get every permission (RS-Pos convention) — use a scoped user to exercise the gate.
    $this->actingAs(userWithPermissions(['contact.view']));

    $this->get('/products/search?q=abc')->assertForbidden();
});
