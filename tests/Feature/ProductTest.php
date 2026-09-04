<?php

use App\Enums\StockMovementType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/products')->assertRedirect('/login');
});

test('products page lists products with their stock status', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create(['name' => 'Split AC 1.5 Ton', 'current_stock' => 2, 'minimum_stock_level' => 5]);

    $this->get('/products')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('products/index')
            ->where('products.data.0.name', 'Split AC 1.5 Ton')
            ->where('products.data.0.stock_status', 'low_stock'));
});

test('creating a product with an opening stock records the opening movement and sets avg_cost', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();
    $unit = Unit::factory()->create();

    $this->post('/products', [
        'name' => 'Refrigerator 300L',
        'sku' => 'FRIDGE-300',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'selling_price' => 45000,
        'manage_stock' => true,
        'is_for_sale' => true,
        'is_active' => true,
        'has_installation_service' => true,
        'emi_available' => false,
        'track_serial_number' => false,
        'opening_stock' => 10,
        'opening_stock_cost' => 32000,
    ])->assertRedirect('/products');

    $product = Product::query()->firstOrFail();

    expect($product->current_stock)->toBe(10.0)
        ->and($product->avg_cost)->toBe(32000.0)
        ->and($product->stockMovements()->where('type', StockMovementType::OpeningStock)->count())->toBe(1);
});

test('sku must be unique', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();
    $unit = Unit::factory()->create();
    Product::factory()->create(['sku' => 'DUP-1']);

    $this->post('/products', [
        'name' => 'Another Product',
        'sku' => 'DUP-1',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'selling_price' => 1000,
        'manage_stock' => true,
        'is_for_sale' => true,
        'is_active' => true,
        'has_installation_service' => false,
        'emi_available' => false,
        'track_serial_number' => false,
    ])->assertSessionHasErrors('sku');
});

test('opening stock is rejected once the product already has a stock movement', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory()]);
    StockMovement::factory()->create(['product_id' => $product->id, 'type' => StockMovementType::OpeningStock, 'quantity' => 5]);

    $this->patch("/products/{$product->id}", [
        'name' => $product->name,
        'sku' => $product->sku,
        'category_id' => $product->category_id,
        'unit_id' => $product->unit_id,
        'selling_price' => $product->selling_price,
        'manage_stock' => true,
        'is_for_sale' => true,
        'is_active' => true,
        'has_installation_service' => false,
        'emi_available' => false,
        'track_serial_number' => false,
        'opening_stock' => 20,
        'opening_stock_cost' => 100,
    ])->assertSessionHasErrors('opening_stock');

    expect($product->stockMovements()->count())->toBe(1);
});

test('updating a product without touching opening stock is unaffected by the lock', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create([
        'category_id' => Category::factory(),
        'unit_id' => Unit::factory(),
        'name' => 'Old Name',
    ]);
    StockMovement::factory()->create(['product_id' => $product->id, 'type' => StockMovementType::OpeningStock, 'quantity' => 5]);

    $this->patch("/products/{$product->id}", [
        'name' => 'New Name',
        'sku' => $product->sku,
        'category_id' => $product->category_id,
        'unit_id' => $product->unit_id,
        'selling_price' => $product->selling_price,
        'manage_stock' => true,
        'is_for_sale' => true,
        'is_active' => true,
        'has_installation_service' => false,
        'emi_available' => false,
        'track_serial_number' => false,
    ])->assertRedirect('/products');

    expect($product->fresh()->name)->toBe('New Name');
});

test('stock adjustment corrects the current stock to the counted quantity', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory(), 'current_stock' => 10]);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'quantity' => 7,
        'reason' => 'Damaged units',
    ])->assertRedirect();

    $movement = StockMovement::query()->where('product_id', $product->id)->firstOrFail();

    expect($product->fresh()->current_stock)->toBe(7.0)
        ->and($movement->type)->toBe(StockMovementType::AdjustmentDecrease)
        ->and($movement->quantity)->toBe(3.0);
});

test('a product with stock movements cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory()]);
    StockMovement::factory()->create(['product_id' => $product->id]);

    $this->delete("/products/{$product->id}")->assertSessionHasErrors('product');

    expect(Product::query()->find($product->id))->not->toBeNull();
});

test('a category name only has to be unique within its own parent', function () {
    $this->actingAs(User::factory()->create());
    $parentA = Category::factory()->create();
    $parentB = Category::factory()->create();
    Category::factory()->create(['name' => 'Accessories', 'parent_id' => $parentA->id]);

    $this->post('/categories', ['name' => 'Accessories', 'parent_id' => $parentB->id])
        ->assertSessionDoesntHaveErrors('name');

    $this->post('/categories', ['name' => 'Accessories', 'parent_id' => $parentA->id])
        ->assertSessionHasErrors('name');
});

test('a brand in use by a product cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $brand = Brand::factory()->create();
    Product::factory()->create(['brand_id' => $brand->id, 'category_id' => Category::factory(), 'unit_id' => Unit::factory()]);

    $this->delete("/brands/{$brand->id}")->assertSessionHasErrors('brand');

    expect(Brand::query()->find($brand->id))->not->toBeNull();
});
