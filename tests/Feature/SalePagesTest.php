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
    $this->actingAs(userWithPermissions(['sale.view_all']));
    Sale::factory()->create(['customer_id' => Contact::factory(), 'total_amount' => 1000, 'paid_amount' => 600, 'due_amount' => 400]);

    $this->get('/sales')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/index')
            ->where('stats.total_sales', 1)
            ->where('stats.total_amount', 1000)
            ->where('stats.total_paid', 600)
            ->where('stats.total_due', 400));
});

test('the sales list search matches by invoice number or customer name', function () {
    $this->actingAs(userWithPermissions(['sale.view_all']));
    $alice = Contact::factory()->create(['name' => 'Alice Traders']);
    $bob = Contact::factory()->create(['name' => 'Bob Enterprises']);
    Sale::factory()->create(['customer_id' => $alice->id, 'invoice_no' => 'INV-0001']);
    Sale::factory()->create(['customer_id' => $bob->id, 'invoice_no' => 'INV-0002']);

    $this->get('/sales?search=Alice')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sales/index')
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-0001'));

    $this->get('/sales?search=INV-0002')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.invoice_no', 'INV-0002'));
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
    $product = Product::factory()->create(['current_stock' => 5]);

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
