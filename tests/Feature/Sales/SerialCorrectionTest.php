<?php

use App\Enums\SerialNumberStatus;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SerialNumber;

/*
 * Fixing a wrongly typed serial on a confirmed sale, and putting a customer-returned unit back in stock.
 * Neither moves stock quantity or money — only which physical unit the line points to.
 */

function soldLine(string $serial = 'SN-WRONG', ?Product $product = null): array
{
    $product ??= Product::factory()->create(['track_serial_number' => true]);
    $sale = Sale::factory()->confirmed()->create(['created_by' => auth()->id()]);
    $item = SaleItem::factory()->create(['sale_id' => $sale->id, 'product_id' => $product->id]);
    $sold = SerialNumber::factory()->create([
        'product_id' => $product->id,
        'serial_number' => $serial,
        'status' => SerialNumberStatus::Sold,
        'sale_item_id' => $item->id,
    ]);

    return [$sale, $item, $sold, $product];
}

test('the wrong serial goes back to stock and the real unit becomes sold on the line', function () {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    [$sale, $item, $wrong, $product] = soldLine();
    $real = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-REAL']);

    $this->patch(route('sales.serials.update', [$sale, $item]), ['from' => 'SN-WRONG', 'to' => 'SN-REAL'])
        ->assertSessionHasNoErrors();

    expect($wrong->fresh()->status)->toBe(SerialNumberStatus::InStock)
        ->and($wrong->fresh()->sale_item_id)->toBeNull()
        ->and($real->fresh()->status)->toBe(SerialNumberStatus::Sold)
        ->and($real->fresh()->sale_item_id)->toBe($item->id);
});

test('a replacement that is not an in-stock unit of the same product is refused', function (string $case) {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    [$sale, $item, $wrong, $product] = soldLine();

    $replacement = match ($case) {
        'already sold' => SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-X', 'status' => SerialNumberStatus::Sold]),
        'other product' => SerialNumber::factory()->create(['serial_number' => 'SN-X']),
        'unknown' => null,
    };

    $this->patch(route('sales.serials.update', [$sale, $item]), ['from' => 'SN-WRONG', 'to' => 'SN-X'])
        ->assertSessionHasErrors('serial');

    expect($wrong->fresh()->status)->toBe(SerialNumberStatus::Sold);

    if ($replacement !== null) {
        expect($replacement->fresh()->status)->toBe($replacement->status);
    }
})->with(['already sold', 'other product', 'unknown']);

test('only a sold unit on that line can be changed', function () {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    [$sale, $item, $wrong, $product] = soldLine();
    $wrong->update(['status' => SerialNumberStatus::Returned]);
    SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-REAL']);

    $this->patch(route('sales.serials.update', [$sale, $item]), ['from' => 'SN-WRONG', 'to' => 'SN-REAL'])
        ->assertSessionHasErrors('serial');
});

test('a returned unit can be restocked and then sold again', function () {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    [$sale, $item, $unit] = soldLine('SN-BACK');
    $unit->update(['status' => SerialNumberStatus::Returned]);

    $this->post(route('sales.serials.restock', [$sale, $item]), ['from' => 'SN-BACK'])
        ->assertSessionHasNoErrors();

    expect($unit->fresh()->status)->toBe(SerialNumberStatus::InStock)
        ->and($unit->fresh()->sale_item_id)->toBeNull();
});

test('a unit that is still sold cannot be restocked', function () {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    [$sale, $item, $unit] = soldLine('SN-SOLD');

    $this->post(route('sales.serials.restock', [$sale, $item]), ['from' => 'SN-SOLD'])
        ->assertSessionHasErrors('serial');

    expect($unit->fresh()->status)->toBe(SerialNumberStatus::Sold);
});

test('serial changes need the sale edit permission and a line of that sale', function () {
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.create']));
    [$sale, $item] = soldLine();

    $this->patch(route('sales.serials.update', [$sale, $item]), ['from' => 'SN-WRONG', 'to' => 'SN-REAL'])->assertForbidden();

    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.edit']));
    $otherItem = SaleItem::factory()->create();

    $this->patch(route('sales.serials.update', [$sale, $otherItem]), ['from' => 'SN-WRONG', 'to' => 'SN-REAL'])->assertNotFound();
});
