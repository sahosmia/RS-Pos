<?php

use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/global-search?q=test')->assertRedirect('/login');
});

test('a blank query is rejected', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson('/global-search?q=')->assertInvalid('q');
});

test('search matches products, contacts and sales by name/sku/invoice and groups them by module', function () {
    $user = userWithPermissions(['product.view', 'contact.view', 'sale.view_all']);
    $this->actingAs($user);

    $product = Product::factory()->create(['name' => 'Split AC 1.5 Ton', 'sku' => 'AC-SPLIT-15']);
    Product::factory()->create(['name' => 'Refrigerator 300L', 'sku' => 'FRIDGE-300']);

    $contact = Contact::factory()->create(['name' => 'Split Traders Ltd']);
    Contact::factory()->create(['name' => 'Unrelated Supplier']);

    $sale = Sale::factory()->create(['invoice_no' => 'SPLIT-2026-001']);
    Sale::factory()->create(['invoice_no' => 'INV-9999']);

    $response = $this->getJson('/global-search?q=split')->assertOk();

    $response->assertJsonPath('products.0.id', $product->id)
        ->assertJsonCount(1, 'products')
        ->assertJsonPath('contacts.0.id', $contact->id)
        ->assertJsonCount(1, 'contacts')
        ->assertJsonPath('sales.0.id', $sale->id)
        ->assertJsonCount(1, 'sales')
        ->assertJsonCount(0, 'purchases')
        ->assertJsonCount(0, 'expenses');
});

test('search filters out modules where user lacks permission', function () {
    $user = userWithPermissions(['product.view']);
    $this->actingAs($user);

    Product::factory()->create(['name' => 'Split AC 1.5 Ton', 'sku' => 'AC-SPLIT-15']);
    Contact::factory()->create(['name' => 'Split Traders Ltd']);
    Sale::factory()->create(['invoice_no' => 'SPLIT-2026-001']);

    $response = $this->getJson('/global-search?q=split')->assertOk();

    $response->assertJsonCount(1, 'products')
        ->assertJsonCount(0, 'contacts')
        ->assertJsonCount(0, 'sales')
        ->assertJsonCount(0, 'purchases')
        ->assertJsonCount(0, 'expenses');
});

test('search results include a url to the record page', function () {
    $this->actingAs(userWithPermissions(['product.view']));

    $product = Product::factory()->create(['name' => 'Split AC 1.5 Ton', 'sku' => 'AC-SPLIT-15']);

    $this->getJson('/global-search?q=split')
        ->assertOk()
        ->assertJsonPath('products.0.url', route('products.edit', $product));
});

test('no matches returns empty groups instead of an error', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson('/global-search?q=nonexistent-xyz')
        ->assertOk()
        ->assertJsonCount(0, 'products')
        ->assertJsonCount(0, 'contacts')
        ->assertJsonCount(0, 'sales')
        ->assertJsonCount(0, 'purchases')
        ->assertJsonCount(0, 'expenses');
});
