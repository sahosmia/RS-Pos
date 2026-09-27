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
    $this->actingAs(userWithPermissions(['purchase.view_all']));
    Purchase::factory()->create(['supplier_id' => Contact::factory()->supplier(), 'total_amount' => 2000, 'paid_amount' => 1500, 'due_amount' => 500]);

    $this->get('/purchases')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('purchases/index')
            ->where('stats.total_purchases', 1)
            ->where('stats.total_amount', 2000)
            ->where('stats.total_paid', 1500)
            ->where('stats.total_due', 500));
});

test('the purchases list search matches by invoice number or supplier name', function () {
    $this->actingAs(userWithPermissions(['purchase.view_all']));
    $alice = Contact::factory()->supplier()->create(['name' => 'Alice Traders']);
    $bob = Contact::factory()->supplier()->create(['name' => 'Bob Enterprises']);
    Purchase::factory()->create(['supplier_id' => $alice->id, 'invoice_no' => 'PUR-0001']);
    Purchase::factory()->create(['supplier_id' => $bob->id, 'invoice_no' => 'PUR-0002']);

    $this->get('/purchases?search=Alice')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('purchases/index')
            ->has('purchases.data', 1)
            ->where('purchases.data.0.invoice_no', 'PUR-0001'));

    $this->get('/purchases?search=PUR-0002')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('purchases.data', 1)
            ->where('purchases.data.0.invoice_no', 'PUR-0002'));
});

test('the add purchase page renders with no initial supplier/product selection', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/purchases/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('purchases/create')
            ->where('initialSupplier', null)
            ->where('initialProducts', []));
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

test('the edit purchase page renders with the already-picked supplier/products, no full list preloaded', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create(['name' => 'Existing Supplier']);
    $product = Product::factory()->create(['name' => 'Existing Product']);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 50, 'subtotal' => 100]);

    $this->get("/purchases/{$purchase->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('purchases/edit')
            ->where('initialSupplier.id', $supplier->id)
            ->where('initialSupplier.name', 'Existing Supplier')
            ->has('initialProducts', 1)
            ->where('initialProducts.0.id', $product->id)
            ->where('initialProducts.0.name', 'Existing Product'));
});

test('the edit purchase page is forbidden for a received purchase', function () {
    $this->actingAs(User::factory()->create());
    $purchase = Purchase::factory()->received()->create(['supplier_id' => Contact::factory()->supplier()]);

    $this->get("/purchases/{$purchase->id}/edit")->assertForbidden();
});
