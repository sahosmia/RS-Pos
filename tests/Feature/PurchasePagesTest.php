<?php

use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('the purchases list page renders', function () {
    $this->actingAs(User::factory()->create());
    Purchase::factory()->create(['supplier_id' => Contact::factory()->supplier()]);

    $this->get('/purchases')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchases/index'));
});

test('the add purchase page renders', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/purchases/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchases/create'));
});

test('the purchase detail page renders', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create();
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 50, 'subtotal' => 100]);
    $purchase->forceFill(['total_amount' => 100, 'due_amount' => 100])->save();

    $this->get("/purchases/{$purchase->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('purchases/show')
            ->where('purchase.invoice_no', $purchase->invoice_no)
            ->has('purchase.items', 1));
});

test('the edit purchase page renders for a draft purchase', function () {
    $this->actingAs(User::factory()->create());
    $purchase = Purchase::factory()->create(['supplier_id' => Contact::factory()->supplier()]);

    $this->get("/purchases/{$purchase->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchases/edit'));
});

test('the edit purchase page is forbidden for a received purchase', function () {
    $this->actingAs(User::factory()->create());
    $purchase = Purchase::factory()->received()->create(['supplier_id' => Contact::factory()->supplier()]);

    $this->get("/purchases/{$purchase->id}/edit")->assertForbidden();
});
