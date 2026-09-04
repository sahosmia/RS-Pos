<?php

use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('guests are redirected to the login page', function () {
    $this->get('/purchases')->assertRedirect('/login');
});

test('creating a draft purchase has no stock or ledger effect', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 0]);

    $this->post('/purchases', [
        'supplier_id' => $supplier->id,
        'purchase_date' => '2026-03-01',
        'status' => 'draft',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100],
        ],
    ])->assertRedirect();

    $purchase = Purchase::query()->firstOrFail();

    expect($purchase->status)->toBe(PurchaseStatus::Draft)
        ->and($purchase->total_amount)->toBe(1000.0)
        ->and($product->fresh()->current_stock)->toBe(0.0)
        ->and(StockMovement::query()->count())->toBe(0)
        ->and(ContactLedger::query()->count())->toBe(0);
});

test('a draft purchase can be edited and deleted freely', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create();
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 50, 'subtotal' => 250]);
    $purchase->forceFill(['total_amount' => 250, 'due_amount' => 250])->save();

    $this->patch("/purchases/{$purchase->id}", [
        'supplier_id' => $supplier->id,
        'purchase_date' => '2026-03-02',
        'status' => 'ordered',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 8, 'unit_price' => 60],
        ],
    ])->assertRedirect();

    expect($purchase->fresh()->status)->toBe(PurchaseStatus::Ordered)
        ->and($purchase->fresh()->total_amount)->toBe(480.0);

    $this->delete("/purchases/{$purchase->id}")->assertRedirect('/purchases');
    expect(Purchase::query()->find($purchase->id))->toBeNull();
});

test('confirming a purchase increases stock and recalculates avg_cost correctly', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 10, 'avg_cost' => 80]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $this->post("/purchases/{$purchase->id}/confirm", [])->assertRedirect();

    // (10*80 + 10*100) / 20 = 90
    expect($product->fresh()->avg_cost)->toBe(90.0)
        ->and($product->fresh()->current_stock)->toBe(20.0)
        ->and($purchase->fresh()->status)->toBe(PurchaseStatus::Received)
        ->and($purchase->fresh()->due_amount)->toBe(1000.0)
        ->and($purchase->fresh()->payment_status->value)->toBe('due')
        ->and($supplier->fresh()->balance)->toBe(-1000.0)
        ->and(StockMovement::query()->where('type', StockMovementType::Purchase)->count())->toBe(1)
        ->and(ContactLedger::query()->where('type', ContactLedgerType::PurchaseBill)->count())->toBe(1);
});

test('avg_cost is set directly to the purchase price when stock starts at zero', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 120, 'subtotal' => 600]);
    $purchase->forceFill(['total_amount' => 600, 'due_amount' => 600])->save();

    $this->post("/purchases/{$purchase->id}/confirm", []);

    expect($product->fresh()->avg_cost)->toBe(120.0);
});

test('confirming with a split payment reduces due and moves account balances', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $cash = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 5000]);
    $bank = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 5000]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $this->post("/purchases/{$purchase->id}/confirm", [
        'payments' => [
            ['account_id' => $cash->id, 'amount' => 300],
            ['account_id' => $bank->id, 'amount' => 200],
        ],
    ])->assertRedirect();

    expect($cash->fresh()->current_balance)->toBe(4700.0)
        ->and($bank->fresh()->current_balance)->toBe(4800.0)
        ->and($purchase->fresh()->paid_amount)->toBe(500.0)
        ->and($purchase->fresh()->due_amount)->toBe(500.0)
        ->and($purchase->fresh()->payment_status->value)->toBe('partial')
        ->and($supplier->fresh()->balance)->toBe(-500.0);
});

test('confirming while applying supplier credit offsets the due without touching accounts', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create(['balance' => 500]);
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $this->post("/purchases/{$purchase->id}/confirm", [
        'credit_applied' => 500,
    ])->assertRedirect();

    expect($purchase->fresh()->paid_amount)->toBe(500.0)
        ->and($purchase->fresh()->due_amount)->toBe(500.0)
        ->and($supplier->fresh()->balance)->toBe(-500.0)
        ->and(ContactLedger::query()->where('type', ContactLedgerType::CreditApplied)->count())->toBe(1);
});

test('a received purchase cannot be edited or deleted', function () {
    $this->actingAs(User::factory()->create());
    $purchase = Purchase::factory()->received()->create(['supplier_id' => Contact::factory()->supplier()]);

    $this->delete("/purchases/{$purchase->id}")->assertSessionHasErrors('purchase');
    expect(Purchase::query()->find($purchase->id))->not->toBeNull();
});

test('adding a payment to a received purchase further reduces the due', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 1000]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 10, 'unit_price' => 100, 'subtotal' => 1000]);
    $purchase->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    // Confirm with an initial 500 payment, leaving 500 due.
    $this->post("/purchases/{$purchase->id}/confirm", [
        'payments' => [['account_id' => $account->id, 'amount' => 500]],
    ]);

    // Then settle the rest.
    $this->post("/purchases/{$purchase->id}/payments", [
        'payments' => [['account_id' => $account->id, 'amount' => 500]],
    ])->assertRedirect();

    expect($purchase->fresh()->paid_amount)->toBe(1000.0)
        ->and($purchase->fresh()->due_amount)->toBe(0.0)
        ->and($purchase->fresh()->payment_status->value)->toBe('paid')
        ->and($account->fresh()->current_balance)->toBe(0.0)
        ->and($supplier->fresh()->balance)->toBe(0.0);
});

test('the supplier field rejects a customer-only contact', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(); // type: customer
    $product = Product::factory()->create();

    $this->post('/purchases', [
        'supplier_id' => $customer->id,
        'purchase_date' => '2026-03-01',
        'status' => 'draft',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10]],
    ])->assertSessionHasErrors('supplier_id');
});
