<?php

use App\Models\Contact;

test('guests are redirected to the login page', function () {
    $this->get('/contacts/search?q=abc')->assertRedirect('/login');
});

test('it requires a non-empty query but no minimum length', function () {
    $this->actingAs(userWithPermissions(['contact.view']));

    $this->getJson('/contacts/search')->assertJsonValidationErrors('q');
    $this->getJson('/contacts/search?q=')->assertJsonValidationErrors('q');
});

test('it matches by name, phone or business name', function () {
    $this->actingAs(userWithPermissions(['contact.view']));

    $match = Contact::factory()->create(['name' => 'Abdul Karim', 'phone' => '+8801700000001', 'business_name' => null]);
    Contact::factory()->create(['name' => 'Rahima Begum', 'phone' => '+8801700000002']);

    $bySingleChar = $this->getJson('/contacts/search?q=K')->json('data');
    expect($bySingleChar)->toHaveCount(1)->and($bySingleChar[0]['id'])->toBe($match->id);

    $byName = $this->getJson('/contacts/search?q=Abdul')->json('data');
    expect($byName)->toHaveCount(1)->and($byName[0]['id'])->toBe($match->id);

    $byPhone = $this->getJson('/contacts/search?q=1700000001')->json('data');
    expect($byPhone)->toHaveCount(1)->and($byPhone[0]['id'])->toBe($match->id);
});

test('the type filter narrows to suppliers or customers only', function () {
    $this->actingAs(userWithPermissions(['contact.view']));

    $supplier = Contact::factory()->supplier()->create(['name' => 'Acme Supplier Co']);
    Contact::factory()->create(['name' => 'Acme Customer Co', 'type' => 'customer']);

    $suppliers = $this->getJson('/contacts/search?q=Acme&type=supplier')->json('data');
    expect($suppliers)->toHaveCount(1)->and($suppliers[0]['id'])->toBe($supplier->id);
});

test('it excludes inactive contacts', function () {
    $this->actingAs(userWithPermissions(['contact.view']));

    Contact::factory()->create(['name' => 'Closed Account Ltd', 'is_active' => false]);

    $this->getJson('/contacts/search?q=Closed')->assertJson(['data' => []]);
});

test('it requires contact.view', function () {
    $this->actingAs(userWithPermissions(['product.view']));

    $this->get('/contacts/search?q=abc')->assertForbidden();
});
