<?php

use App\Enums\StockMovementType;
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
