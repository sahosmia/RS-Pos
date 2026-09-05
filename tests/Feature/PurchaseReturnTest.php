<?php

use App\Actions\Purchase\ConfirmPurchaseAction;
use App\Actions\PurchaseReturn\CreatePurchaseReturnAction;
use App\Actions\PurchaseReturn\RefundPurchaseReturnAction;
use App\Enums\SerialNumberStatus;
use App\Exceptions\ReturnQuantityExceedsRemainingException;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\SerialNumber;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

function receivedPurchase(Contact $supplier, Product $product, float $quantity, float $unitPrice): Purchase
{
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create([
        'product_id' => $product->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'subtotal' => $quantity * $unitPrice,
    ]);
    $purchase->forceFill(['total_amount' => $quantity * $unitPrice, 'due_amount' => $quantity * $unitPrice])->save();

    return app(ConfirmPurchaseAction::class)->execute($purchase);
}

test('creating a purchase return decreases stock, reduces what we owe the supplier, and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = receivedPurchase($supplier, $product, 10, 50);

    expect($product->fresh()->current_stock)->toBe(10.0)
        ->and($supplier->fresh()->balance)->toBe(-500.0);

    $purchaseItem = $purchase->items()->firstOrFail();

    $return = app(CreatePurchaseReturnAction::class)->execute([
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'reason' => 'Wrong model',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 2]],
    ]);

    expect($product->fresh()->current_stock)->toBe(8.0)
        ->and($supplier->fresh()->balance)->toBe(-400.0)
        ->and($return->total_amount)->toBe(100.0);

    $entry = JournalEntry::where('reference_type', 'purchase_return')->where('reference_id', $return->id)->firstOrFail();
    $payable = ChartOfAccount::where('code', '2100')->firstOrFail();
    $inventory = ChartOfAccount::where('code', '1200')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($payable->fresh()->balance)->toBe(400.0)
        ->and($inventory->fresh()->balance)->toBe(400.0); // purchase +500 then the return -100
});

test('returning more than was purchased throws, even when called directly on the action', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = receivedPurchase($supplier, $product, 5, 50);
    $purchaseItem = $purchase->items()->firstOrFail();

    $attempt = fn () => app(CreatePurchaseReturnAction::class)->execute([
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 6]],
    ]);

    expect($attempt)->toThrow(ReturnQuantityExceedsRemainingException::class)
        ->and(PurchaseReturn::query()->count())->toBe(0);
});

test('the store endpoint rejects a return against a draft purchase', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchaseItem = $purchase->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 50, 'subtotal' => 50]);

    $this->post('/purchase-returns', [
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 1]],
    ])->assertSessionHasErrors('purchase_id');
});

test('a serial-tracked purchase return disposes the in-stock unit', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0, 'track_serial_number' => true]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchaseItem = $purchase->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500, 'subtotal' => 500]);
    $purchase->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();
    app(ConfirmPurchaseAction::class)->execute($purchase, [], 0.0, [$purchaseItem->id => ['SN-PRET-1']]);

    $serial = SerialNumber::where('serial_number', 'SN-PRET-1')->firstOrFail();

    app(CreatePurchaseReturnAction::class)->execute([
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 1]],
    ]);

    expect($serial->fresh()->status)->toBe(SerialNumberStatus::Disposed);
});

test('refunding a purchase return that was already fully paid settles the supplier back to zero', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 1000]);

    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 100, 'subtotal' => 200]);
    $purchase->forceFill(['total_amount' => 200, 'due_amount' => 200])->save();
    app(ConfirmPurchaseAction::class)->execute($purchase, [['account_id' => $account->id, 'amount' => 200]]);

    expect($supplier->fresh()->balance)->toBe(0.0);

    $purchaseItem = $purchase->items()->firstOrFail();
    $return = app(CreatePurchaseReturnAction::class)->execute([
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 1]],
    ]);

    // Already-paid-in-full purchase, now returned, means the supplier owes us.
    expect($supplier->fresh()->balance)->toBe(100.0);

    app(RefundPurchaseReturnAction::class)->execute($return, [['account_id' => $account->id, 'amount' => 100]]);

    expect($supplier->fresh()->balance)->toBe(0.0);

    $refundEntry = JournalEntry::where('reference_type', 'purchase_return_refund')->where('reference_id', $return->id)->firstOrFail();
    expect($refundEntry->lines->sum('debit'))->toBe($refundEntry->lines->sum('credit'));
});

test('purchase returns and refund pages render', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = receivedPurchase($supplier, $product, 5, 50);
    $purchaseItem = $purchase->items()->firstOrFail();

    $this->get("/purchase-returns/create?purchase_id={$purchase->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchase-returns/create')->has('purchase.items', 1));

    $return = app(CreatePurchaseReturnAction::class)->execute([
        'purchase_id' => $purchase->id,
        'return_date' => '2026-03-05',
        'items' => [['purchase_item_id' => $purchaseItem->id, 'quantity' => 1]],
    ]);

    $this->get('/purchase-returns')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchase-returns/index')->has('returns.data', 1));

    $this->get("/purchase-returns/{$return->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('purchase-returns/show')->where('return.total_amount', 50));
});
