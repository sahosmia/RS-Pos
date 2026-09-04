<?php

use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('the sales list page renders', function () {
    $this->actingAs(User::factory()->create());
    Sale::factory()->create(['customer_id' => Contact::factory()]);

    $this->get('/sales')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/index'));
});

test('the add sale page renders', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/sales/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/create'));
});

test('the sale detail page renders and flags a fresh confirm for the undo toast', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create();

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100]],
    ]);

    $sale = Sale::query()->firstOrFail();

    $this->get("/sales/{$sale->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/show')
            ->where('sale.invoice_no', $sale->invoice_no)
            ->where('justConfirmed', true));

    // A plain visit afterwards no longer carries the flag.
    $this->get("/sales/{$sale->id}")
        ->assertInertia(fn ($page) => $page->where('justConfirmed', false));
});

test('the edit sale page renders for a draft sale', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->create(['customer_id' => Contact::factory()]);

    $this->get("/sales/{$sale->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sales/edit'));
});

test('the edit sale page is forbidden for a confirmed sale', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);

    $this->get("/sales/{$sale->id}/edit")->assertForbidden();
});

test('a contact detail page lists their purchases and sales', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['type' => 'both']);
    $sale = Sale::factory()->create(['customer_id' => $contact->id, 'invoice_no' => 'INV-SALE-1']);

    $this->get("/contacts/{$contact->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('contacts/show')
            ->has('sales', 1)
            ->where('sales.0.invoice_no', $sale->invoice_no)
            ->has('purchases', 0));
});
