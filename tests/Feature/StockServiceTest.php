<?php

use App\Enums\StockMovementType;
use App\Exceptions\InsufficientStockException;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockService;

test('increase records a movement and raises the cached stock together', function () {
    $product = Product::factory()->create(['current_stock' => 0]);

    $movement = app(StockService::class)->increase(
        $product,
        10,
        StockMovementType::OpeningStock,
    );

    expect($movement->type)->toBe(StockMovementType::OpeningStock)
        ->and($movement->quantity)->toBe(10.0)
        ->and($product->fresh()->current_stock)->toBe(10.0);
});

test('decrease records a movement and lowers the cached stock together', function () {
    $product = Product::factory()->create(['current_stock' => 20]);

    app(StockService::class)->decrease(
        $product,
        7,
        StockMovementType::Sale,
        'sale',
        3,
    );

    $movement = StockMovement::query()->where('reference_type', 'sale')->where('reference_id', 3)->firstOrFail();

    expect($movement->type)->toBe(StockMovementType::Sale)
        ->and($product->fresh()->current_stock)->toBe(13.0);
});

test('decrease throws when a stock-managed product does not have enough left', function () {
    $product = Product::factory()->create(['current_stock' => 5, 'manage_stock' => true]);

    $decrease = fn () => app(StockService::class)->decrease($product, 10, StockMovementType::Sale);

    expect($decrease)->toThrow(InsufficientStockException::class)
        ->and($product->fresh()->current_stock)->toBe(5.0);
});

test('decrease ignores the stock check for a product with manage_stock disabled', function () {
    $product = Product::factory()->create(['current_stock' => 0, 'manage_stock' => false]);

    app(StockService::class)->decrease($product, 10, StockMovementType::Sale);

    expect($product->fresh()->current_stock)->toBe(-10.0);
});

/**
 * SQLite in-memory (the test driver) shares one connection per process, so a
 * true two-connection race can't be exercised here. This instead proves the
 * guard itself: with exactly one unit left, a second decrease for the same
 * unit must fail once the first has already claimed it — the same
 * lockForUpdate()-guarded check that prevents two simultaneous sales of the
 * last unit from both succeeding against a real database.
 */
test('two competing decreases for the last unit of stock — only one succeeds', function () {
    $product = Product::factory()->create(['current_stock' => 1, 'manage_stock' => true]);

    app(StockService::class)->decrease($product, 1, StockMovementType::Sale, 'sale', 1);

    $secondSale = fn () => app(StockService::class)->decrease($product, 1, StockMovementType::Sale, 'sale', 2);

    expect($secondSale)->toThrow(InsufficientStockException::class)
        ->and($product->fresh()->current_stock)->toBe(0.0)
        ->and(StockMovement::query()->where('reference_type', 'sale')->count())->toBe(1);
});
