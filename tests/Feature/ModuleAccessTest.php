<?php

use App\Models\Contact;
use App\Models\User;

/*
 * corrections.md #9 — the sidebar only hides menus; these prove the backend
 * refuses direct URL access to modules the user has no permission for.
 */

test('a user without the module permission gets 403 on its pages', function (string $url) {
    $this->actingAs(userWithPermissions(['product.view']))
        ->get($url)
        ->assertForbidden();
})->with([
    '/expenses', '/accounts', '/assets', '/staff', '/contacts', '/reports/profit-loss',
    '/imports', '/business-settings', '/service-requests', '/journal-entries',
]);

test('view permission opens the list but not write actions', function () {
    $user = userWithPermissions(['expense.view']);

    $this->actingAs($user)->get('/expenses')->assertOk();
    $this->actingAs($user)->post('/expenses', [])->assertForbidden();
    $this->actingAs($user)->post('/expense-categories', [])->assertForbidden();
});

test('sales list accepts either view_own or view_all', function () {
    $this->actingAs(userWithPermissions(['sale.view_own']))->get('/sales')->assertOk();
    $this->actingAs(userWithPermissions(['sale.view_all']))->get('/sales')->assertOk();
    $this->actingAs(userWithPermissions(['sale.create']))->get('/sales')->assertForbidden();
});

test('one-off actions need their own permission', function () {
    $contactEditor = userWithPermissions(['contact.view', 'contact.create', 'contact.edit', 'contact.delete']);

    $contact = Contact::factory()->create();

    $this->actingAs($contactEditor)->post("/contacts/{$contact->id}/payments", [])->assertForbidden();
    $this->actingAs($contactEditor)->post('/fund-transfers', [])->assertForbidden();
    $this->actingAs(userWithPermissions(['contact.payment']))->post('/contacts/bulk-delete', [])->assertForbidden();
});

test('guests are still redirected to login', function () {
    $this->get('/expenses')->assertRedirect('/login');
});

test('factory users can reach gated pages by default', function () {
    $this->actingAs(User::factory()->create())->get('/expenses')->assertOk();
});
