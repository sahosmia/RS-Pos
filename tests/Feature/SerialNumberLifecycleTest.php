<?php

use App\Actions\Purchase\ConfirmPurchaseAction;
use App\Actions\Sale\CancelSaleAction;
use App\Actions\Sale\ConfirmSaleAction;
use App\Enums\SerialNumberStatus;
use App\Exceptions\InvalidSerialSelectionException;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SerialNumber;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('confirming a purchase for a serial-tracked product creates one in_stock row per unit', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $item = $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 500, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    app(ConfirmPurchaseAction::class)->execute($purchase, [], 0.0, [
        $item->id => ['SN-100', 'SN-101'],
    ]);

    $serials = SerialNumber::query()->where('product_id', $product->id)->orderBy('serial_number')->get();

    expect($serials)->toHaveCount(2)
        ->and($serials->pluck('serial_number')->all())->toBe(['SN-100', 'SN-101'])
        ->and($serials->pluck('status')->unique()->all())->toBe([SerialNumberStatus::InStock])
        ->and($serials->pluck('purchase_item_id')->unique()->all())->toBe([$item->id])
        ->and($product->fresh()->current_stock)->toBe(2.0);
});

test('confirming a purchase throws when the serial count does not match the quantity', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $item = $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 500, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $confirm = fn () => app(ConfirmPurchaseAction::class)->execute($purchase, [], 0.0, [
        $item->id => ['SN-100'],
    ]);

    expect($confirm)->toThrow(InvalidSerialSelectionException::class)
        ->and(SerialNumber::query()->count())->toBe(0)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('confirming a purchase throws when a serial already exists for that product', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 0]);
    SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-100']);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $item = $purchase->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500, 'subtotal' => 500]);
    $purchase->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();

    $confirm = fn () => app(ConfirmPurchaseAction::class)->execute($purchase, [], 0.0, [
        $item->id => ['SN-100'],
    ]);

    expect($confirm)->toThrow(InvalidSerialSelectionException::class);
});

test('confirming a sale for a serial-tracked product marks the chosen unit sold', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 1, 'avg_cost' => 400]);
    $serial = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-200']);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $item = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 700, 'original_price' => 700, 'subtotal' => 700]);
    $sale->forceFill(['total_amount' => 700, 'due_amount' => 700])->save();

    app(ConfirmSaleAction::class)->execute($sale, [], [$item->id => ['SN-200']]);

    expect($serial->fresh()->status)->toBe(SerialNumberStatus::Sold)
        ->and($serial->fresh()->sale_item_id)->toBe($item->id)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('confirming a sale throws when the chosen serial is already sold', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 1]);
    SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-300', 'status' => 'sold']);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $item = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 700, 'original_price' => 700, 'subtotal' => 700]);
    $sale->forceFill(['total_amount' => 700, 'due_amount' => 700])->save();

    $confirm = fn () => app(ConfirmSaleAction::class)->execute($sale, [], [$item->id => ['SN-300']]);

    expect($confirm)->toThrow(InvalidSerialSelectionException::class)
        ->and($product->fresh()->current_stock)->toBe(1.0);
});

test('cancelling a confirmed sale releases its sold serials back to in_stock', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 1, 'avg_cost' => 400]);
    $serial = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-400']);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $item = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 700, 'original_price' => 700, 'subtotal' => 700]);
    $sale->forceFill(['total_amount' => 700, 'due_amount' => 700])->save();

    $confirmed = app(ConfirmSaleAction::class)->execute($sale, [], [$item->id => ['SN-400']]);
    app(CancelSaleAction::class)->execute($confirmed);

    expect($serial->fresh()->status)->toBe(SerialNumberStatus::InStock)
        ->and($serial->fresh()->sale_item_id)->toBeNull()
        ->and($product->fresh()->current_stock)->toBe(1.0);
});
