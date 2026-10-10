<?php

use App\Enums\SerialNumberStatus;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\SerialNumber;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());
});

/** A serial product holding the given in-stock serials (stock matches the list), at an average cost of 100. */
function serialProduct(array $serials): Product
{
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => count($serials), 'avg_cost' => 100]);

    foreach ($serials as $serial) {
        SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => $serial, 'status' => SerialNumberStatus::InStock]);
    }

    return $product;
}

test('writing off serial units takes them out of stock and the serial list together', function () {
    $product = serialProduct(['A-1', 'A-2', 'A-3']);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'remove_serials' => ['A-2'],
        'reason' => 'Lost in transit',
    ])->assertSessionHasNoErrors();

    expect($product->fresh()->current_stock)->toBe(2.0)
        ->and($product->serialNumbers()->where('serial_number', 'A-2')->first()->status)->toBe(SerialNumberStatus::WrittenOff)
        ->and($product->serialNumbers()->where('status', SerialNumberStatus::InStock)->count())->toBe(2)
        ->and(StockMovement::query()->where('product_id', $product->id)->sum('quantity'))->toEqual(1);
});

test('serial units that were found enter stock as in stock, and stock goes up by the same number', function () {
    $product = serialProduct(['B-1']);

    $this->post("/products/{$product->id}/stock-adjustments", [
        'add_serials' => ['B-9', 'B-10'],
        'reason' => 'Found in the back room',
    ])->assertSessionHasNoErrors();

    expect($product->fresh()->current_stock)->toBe(3.0)
        ->and($product->serialNumbers()->where('status', SerialNumberStatus::InStock)->count())->toBe(3);
});

test('a serial adjustment posts a balanced journal entry against inventory', function () {
    $product = serialProduct(['C-1', 'C-2']);

    $this->post("/products/{$product->id}/stock-adjustments", ['remove_serials' => ['C-1'], 'reason' => 'Damaged'])->assertSessionHasNoErrors();

    $entry = JournalEntry::query()->where('reference_type', 'stock_adjustment')->firstOrFail();
    $inventory = ChartOfAccount::query()->where('code', '1200')->firstOrFail();
    $loss = ChartOfAccount::query()->where('code', '5110')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe(100.0)
        ->and($entry->lines->sum('credit'))->toBe(100.0)
        ->and($loss->fresh()->balance)->toBe(100.0)
        ->and($inventory->fresh()->balance)->toBe(-100.0);
});

test('a serial that is not in stock cannot be written off, and nothing changes', function () {
    $product = serialProduct(['D-1']);
    SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'D-SOLD', 'status' => SerialNumberStatus::Sold]);

    $this->post("/products/{$product->id}/stock-adjustments", ['remove_serials' => ['D-SOLD'], 'reason' => 'x'])->assertSessionHasErrors('remove_serials');

    expect($product->fresh()->current_stock)->toBe(1.0)
        ->and(StockMovement::query()->count())->toBe(0);
});

test('a found serial that already exists is refused', function () {
    $product = serialProduct(['E-1']);

    $this->post("/products/{$product->id}/stock-adjustments", ['add_serials' => ['E-1'], 'reason' => 'x'])->assertSessionHasErrors('add_serials');

    expect($product->fresh()->current_stock)->toBe(1.0);
});

test('a serial product cannot be adjusted by typing a count', function () {
    $product = serialProduct(['F-1', 'F-2']);

    $this->post("/products/{$product->id}/stock-adjustments", ['quantity' => 1, 'reason' => 'x'])->assertSessionHasErrors('remove_serials');

    expect($product->fresh()->current_stock)->toBe(2.0);
});

test('the in-stock serial list only holds units that are in stock', function () {
    $product = serialProduct(['G-1', 'G-2']);
    $product->serialNumbers()->where('serial_number', 'G-2')->update(['status' => SerialNumberStatus::WrittenOff]);

    $this->getJson("/products/{$product->id}/in-stock-serials")->assertOk()->assertExactJson(['serials' => ['G-1']]);
});

test('a normal stock adjustment posts a balanced journal entry too, so inventory keeps matching the stock', function () {
    $product = Product::factory()->create(['track_serial_number' => false, 'current_stock' => 10, 'avg_cost' => 50]);

    $this->post("/products/{$product->id}/stock-adjustments", ['quantity' => 7, 'reason' => 'Damaged'])->assertSessionHasNoErrors();

    $entry = JournalEntry::query()->where('reference_type', 'stock_adjustment')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe(150.0)
        ->and($entry->lines->sum('credit'))->toBe(150.0)
        ->and($product->fresh()->current_stock)->toBe(7.0);
});
