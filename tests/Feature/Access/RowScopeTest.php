<?php

use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Settings;

/*
 * `sale.view_own` / `purchase.view_own` limit a user to the records they created. The list already did
 * that; these prove the same holds when someone types another record's id straight into the address bar.
 */

test('a view_own user cannot open or change another users sale by id', function (string $method, string $uri) {
    $others = Sale::factory()->create(['created_by' => userWithPermissions([])->id]);
    $user = userWithPermissions(['sale.view_own', 'sale.create', 'sale.edit', 'sale.delete', 'contact.payment']);

    $this->actingAs($user)
        ->call($method, str_replace('{id}', (string) $others->id, $uri))
        ->assertNotFound();
})->with([
    ['GET', '/sales/{id}'],
    ['GET', '/sales/{id}/edit'],
    ['PUT', '/sales/{id}'],
    ['DELETE', '/sales/{id}'],
    ['POST', '/sales/{id}/confirm'],
    ['POST', '/sales/{id}/cancel'],
    ['POST', '/sales/{id}/payments'],
    ['GET', '/sales/{id}/payments'],
]);

test('a view_own user can still open their own sale, and view_all sees everyones', function () {
    Settings::factory()->create();
    $owner = userWithPermissions(['sale.view_own']);
    $mine = Sale::factory()->create(['created_by' => $owner->id]);
    $others = Sale::factory()->create(['created_by' => userWithPermissions([])->id]);

    $this->actingAs($owner)->get("/sales/{$mine->id}")->assertOk();

    $this->actingAs(userWithPermissions(['sale.view_all']))->get("/sales/{$others->id}")->assertOk();
});

test('a view_own user cannot open or change another users purchase by id', function (string $method, string $uri) {
    $others = Purchase::factory()->create(['created_by' => userWithPermissions([])->id]);
    $user = userWithPermissions(['purchase.view_own', 'purchase.create', 'purchase.edit', 'purchase.delete']);

    $this->actingAs($user)
        ->call($method, str_replace('{id}', (string) $others->id, $uri))
        ->assertNotFound();
})->with([
    ['GET', '/purchases/{id}'],
    ['GET', '/purchases/{id}/edit'],
    ['PUT', '/purchases/{id}'],
    ['DELETE', '/purchases/{id}'],
    ['POST', '/purchases/{id}/confirm'],
    ['POST', '/purchases/{id}/cancel'],
    ['POST', '/purchases/{id}/payments'],
]);

test('a view_own user cannot raise a return against someone elses invoice', function () {
    $others = Sale::factory()->confirmed()->create(['created_by' => userWithPermissions([])->id]);
    $user = userWithPermissions(['sale.view_own', 'sale.create']);

    $this->actingAs($user)
        ->get('/sale-returns/create?sale_id='.$others->id)
        ->assertNotFound();

    $this->actingAs($user)
        ->post('/sale-returns', ['sale_id' => $others->id, 'return_date' => now()->toDateString(), 'items' => []])
        ->assertSessionHasErrors('sale_id');
});
