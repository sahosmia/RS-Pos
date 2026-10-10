<?php

use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\ServicePlanTemplate;
use App\Models\Settings;
use App\Models\User;

/*
 * A sale line carries its own warranty and service plan. They default to what the product has, can be changed or
 * removed on the sale, and once the sale is confirmed a later change to the product never reaches it.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());
});

function warrantySale(Product $product, array $line = [], string $status = 'confirmed'): Sale
{
    test()->post('/sales', [
        'customer_id' => Contact::factory()->create()->id,
        'sale_date' => '2026-10-01',
        'status' => $status,
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, ...$line]],
    ])->assertSessionHasNoErrors();

    return Sale::query()->latest('id')->firstOrFail();
}

function warrantyProduct(?int $months = 12): Product
{
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 10, 'warranty_period_months' => $months]);
    ServicePlanTemplate::factory()->create(['product_id' => $product->id, 'period_number' => 1, 'period_months' => 6, 'free_quota' => 1]);

    return $product;
}

test('a line that never chose takes the product warranty and records it', function () {
    $item = warrantySale(warrantyProduct(12))->items()->firstOrFail();

    expect($item->warranty_months)->toBe(12)
        ->and($item->warranty_expires_at->toDateString())->toBe('2027-10-01');
});

test('the warranty can be changed on the sale', function () {
    $item = warrantySale(warrantyProduct(12), ['warranty_months' => 3])->items()->firstOrFail();

    expect($item->warranty_months)->toBe(3)
        ->and($item->warranty_expires_at->toDateString())->toBe('2027-01-01');
});

test('a warranty can be added to a product that has none, or removed from one that has', function () {
    $added = warrantySale(warrantyProduct(null), ['warranty_months' => 6])->items()->firstOrFail();
    $removed = warrantySale(warrantyProduct(12), ['warranty_months' => 0])->items()->firstOrFail();

    expect($added->warranty_expires_at->toDateString())->toBe('2027-04-01')
        ->and($removed->warranty_months)->toBe(0)
        ->and($removed->warranty_expires_at)->toBeNull();
});

test('changing or removing the product warranty later does not touch a sale already made', function () {
    $product = warrantyProduct(12);
    $item = warrantySale($product)->items()->firstOrFail();

    $product->update(['warranty_period_months' => null]);
    $product->servicePlanTemplates()->delete();

    expect($item->fresh()->warranty_months)->toBe(12)
        ->and($item->fresh()->warranty_expires_at->toDateString())->toBe('2027-10-01')
        ->and($item->servicePeriods()->count())->toBe(1);
});

test('the service plan is copied by default and can be left out of one line', function () {
    $with = warrantySale(warrantyProduct())->items()->firstOrFail();
    $without = warrantySale(warrantyProduct(), ['service_plan_included' => false])->items()->firstOrFail();

    expect($with->servicePeriods()->count())->toBe(1)
        ->and($without->service_plan_included)->toBeFalse()
        ->and($without->servicePeriods()->count())->toBe(0);
});

test('a draft keeps its choice, and shows the product warranty as the default when none was chosen', function () {
    $product = warrantyProduct(12);
    $chosen = warrantySale($product, ['warranty_months' => 0], 'draft');
    $default = warrantySale($product, [], 'draft');

    $this->get(route('sales.edit', $chosen))->assertInertia(fn ($page) => $page->where('sale.items.0.warranty_months', 0));
    $this->get(route('sales.edit', $default))->assertInertia(fn ($page) => $page->where('sale.items.0.warranty_months', 12));
});

test('a warranty must be a whole number of months', function () {
    $product = warrantyProduct();

    $this->post('/sales', [
        'customer_id' => Contact::factory()->create()->id, 'sale_date' => '2026-10-01', 'status' => 'draft',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'warranty_months' => -1]],
    ])->assertSessionHasErrors('items.0.warranty_months');
});
