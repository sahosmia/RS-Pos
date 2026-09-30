<?php

use App\Enums\StockMovementType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/products')->assertRedirect('/login');
});

test('products page lists products with their stock status and summary stats', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create([
        'name' => 'Split AC 1.5 Ton',
        'current_stock' => 2,
        'avg_cost' => 1000,
        'minimum_stock_level' => 5,
        'manage_stock' => true,
    ]);
    Product::factory()->create([
        'name' => 'Smart TV 55',
        'current_stock' => 10,
        'avg_cost' => 2000,
        'minimum_stock_level' => 3,
        'manage_stock' => true,
    ]);

    $this->get('/products')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('products/index')
            ->where('products.data.0.name', 'Smart TV 55')
            ->where('products.data.1.name', 'Split AC 1.5 Ton')
            ->where('products.data.1.stock_status', 'low_stock')
            ->where('stats.total_products', 2)
            ->where('stats.total_stock', 12)
            ->where('stats.total_stock_value', 22000)
            ->where('stats.low_stock_count', 1));
});

test('per_page controls how many products come back per page, defaulting to the configured default', function () {
    $this->actingAs(User::factory()->create());
    Settings::factory()->create(['pagination_per_page_options' => [5, 10], 'pagination_default_per_page' => 5]);
    Product::factory()->count(12)->create();

    $this->get('/products')
        ->assertInertia(fn ($page) => $page
            ->where('products.data', fn ($data) => count($data) === 5)
            ->where('products.per_page', 5)
            ->where('products.last_page', 3)
            ->where('filters.per_page', 5));

    $this->get('/products?per_page=10')
        ->assertInertia(fn ($page) => $page
            ->where('products.data', fn ($data) => count($data) === 10)
            ->where('filters.per_page', 10));
});

test('a per_page value outside the configured options falls back to the default instead of erroring', function () {
    $this->actingAs(User::factory()->create());
    Settings::factory()->create(['pagination_per_page_options' => [5, 10], 'pagination_default_per_page' => 5]);
    Product::factory()->count(3)->create();

    $this->get('/products?per_page=9999')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('filters.per_page', 5));
});

test('per_page=all returns every product on a single page when the shop allows it', function () {
    $this->actingAs(User::factory()->create());
    Settings::factory()->create(['pagination_per_page_options' => [5, 10], 'pagination_allow_all' => true]);
    Product::factory()->count(12)->create();

    $this->get('/products?per_page=all')
        ->assertInertia(fn ($page) => $page
            ->where('products.data', fn ($data) => count($data) === 12)
            ->where('products.last_page', 1)
            ->where('filters.per_page', 'all'));
});

test('per_page=all falls back to the default page size when the shop has disabled it', function () {
    $this->actingAs(User::factory()->create());
    Settings::factory()->create(['pagination_per_page_options' => [5, 10], 'pagination_default_per_page' => 5, 'pagination_allow_all' => false]);
    Product::factory()->count(12)->create();

    $this->get('/products?per_page=all')
        ->assertInertia(fn ($page) => $page
            ->where('products.data', fn ($data) => count($data) === 5)
            ->where('filters.per_page', 5));
});

test('products index still works when no Settings row exists at all', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->count(3)->create();

    $this->get('/products')->assertOk();
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

test('product name must be unique', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();
    $unit = Unit::factory()->create();
    Product::factory()->create(['name' => 'Existing Product Name', 'sku' => 'UNIQUE-SKU-1']);

    $this->post('/products', [
        'name' => 'Existing Product Name',
        'sku' => 'UNIQUE-SKU-2',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'selling_price' => 1000,
        'manage_stock' => true,
        'is_for_sale' => true,
        'is_active' => true,
        'has_installation_service' => false,
        'emi_available' => false,
        'track_serial_number' => false,
    ])->assertSessionHasErrors('name');
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

test('stock adjustment requires a reason', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory(), 'current_stock' => 10]);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'quantity' => 7,
    ])->assertSessionHasErrors('reason');
});

test('stock adjustment requires unit_cost when product avg_cost is 0', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory(), 'current_stock' => 0, 'avg_cost' => 0]);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'quantity' => 5,
        'reason' => 'Initial stock count',
    ])->assertSessionHasErrors('unit_cost');

    $this->post("/products/{$product->id}/stock-adjustments", [
        'quantity' => 5,
        'reason' => 'Initial stock count',
        'unit_cost' => 250,
    ])->assertRedirect();

    expect($product->fresh()->avg_cost)->toBe(250.0)
        ->and($product->fresh()->current_stock)->toBe(5.0);
});

test('stock adjustment automatically uses existing avg_cost when avg_cost is greater than 0', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['category_id' => Category::factory(), 'unit_id' => Unit::factory(), 'current_stock' => 5, 'avg_cost' => 120]);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'quantity' => 10,
        'reason' => 'Stock count adjustment',
    ])->assertRedirect();

    $movement = StockMovement::query()->where('product_id', $product->id)->firstOrFail();

    expect($product->fresh()->avg_cost)->toBe(120.0)
        ->and($movement->unit_cost)->toBe(120.0)
        ->and($movement->total_cost)->toBe(600.0);
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

test('product show page renders with stock movement history', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['name' => 'Microwave Oven', 'current_stock' => 15]);
    StockMovement::factory()->create([
        'product_id' => $product->id,
        'type' => StockMovementType::AdjustmentIncrease,
        'quantity' => 15,
        'note' => 'Count adjustment',
    ]);

    $this->get("/products/{$product->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('products/show')
            ->where('product.name', 'Microwave Oven')
            ->where('movements.data.0.quantity', 15)
            ->where('movements.data.0.type', 'adjustment_increase'));
});

test('a brand in use by a product cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $brand = Brand::factory()->create();
    Product::factory()->create(['brand_id' => $brand->id, 'category_id' => Category::factory(), 'unit_id' => Unit::factory()]);

    $this->delete("/brands/{$brand->id}")->assertSessionHasErrors('brand');

    expect(Brand::query()->find($brand->id))->not->toBeNull();
});

test('products index includes avg_cost (P.A.P) in products listing', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create(['name' => 'Test Item', 'avg_cost' => 1500, 'current_stock' => 10, 'selling_price' => 2000]);

    $this->get('/products')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('products/index')
            ->where('products.data.0.avg_cost', 1500)
            ->where('products.data.0.current_stock', 10)
            ->where('products.data.0.selling_price', 2000));
});

test('products export handles pap and tpp columns', function () {
    $this->actingAs(User::factory()->create());
    Product::factory()->create(['name' => 'Export Item', 'sku' => 'EXP-1', 'avg_cost' => 500, 'current_stock' => 4, 'selling_price' => 800, 'manage_stock' => true]);

    $response = $this->get('/products/export?format=csv&scope=all&columns[]=name&columns[]=stock&columns[]=pap&columns[]=tpp&columns[]=price');

    $response->assertOk();
    $content = $response->streamedContent();
    expect($content)->toContain('Purchase Average Price (P.A.P)')
        ->and($content)->toContain('Total Purchase Price (T.P.P)')
        ->and($content)->toContain('500')
        ->and($content)->toContain('2000');
});
