<?php

use App\Enums\ContactLedgerType;
use App\Enums\SaleStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SerialNumber;
use App\Models\Settings;
use App\Models\StockMovement;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('guests are redirected to the login page', function () {
    $this->get('/sales')->assertRedirect('/login');
});

test('creating a draft sale has no stock or ledger effect', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 100, 'current_stock' => 10]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'draft',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 100],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();

    expect($sale->status)->toBe(SaleStatus::Draft)
        ->and($sale->total_amount)->toBe(300.0)
        ->and($product->fresh()->current_stock)->toBe(10.0)
        ->and(StockMovement::query()->count())->toBe(0)
        ->and(ContactLedger::query()->count())->toBe(0);
});

test('confirming a sale decreases stock and updates ledger and account together', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 200, 'current_stock' => 10, 'avg_cost' => 120]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 4, 'unit_price' => 200, 'original_price' => 200, 'subtotal' => 800]);
    $sale->forceFill(['total_amount' => 800, 'due_amount' => 800])->save();

    $this->post("/sales/{$sale->id}/confirm", [
        'payments' => [['account_id' => $account->id, 'amount' => 800]],
    ])->assertRedirect();

    $item = $sale->items()->first();

    expect($product->fresh()->current_stock)->toBe(6.0)
        ->and($item->fresh()->cost_at_sale)->toBe(120.0)
        ->and($sale->fresh()->status)->toBe(SaleStatus::Confirmed)
        ->and($sale->fresh()->paid_amount)->toBe(800.0)
        ->and($sale->fresh()->due_amount)->toBe(0.0)
        ->and($sale->fresh()->payment_status->value)->toBe('paid')
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(800.0)
        ->and(StockMovement::query()->where('type', StockMovementType::Sale)->count())->toBe(1);
});

test('confirming without full payment leaves a receivable on the customer ledger', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500, 'current_stock' => 5, 'avg_cost' => 300]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500, 'original_price' => 500, 'subtotal' => 500]);
    $sale->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();

    $this->post("/sales/{$sale->id}/confirm", [])->assertRedirect();

    expect($customer->fresh()->balance)->toBe(500.0)
        ->and(ContactLedger::query()->where('type', ContactLedgerType::SaleInvoice)->count())->toBe(1)
        ->and($sale->fresh()->payment_status->value)->toBe('due');
});

test('item-level and invoice-level discounts combine correctly', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000]);

    // Item-level: sold at 900 instead of 1000. Invoice-level: 10% off the subtotal.
    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'draft',
        'discount_type' => 'percentage',
        'discount_value' => 10,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 900],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    $item = $sale->items()->first();

    expect($item->discount_amount)->toBe(100.0) // 1000 - 900 per unit
        ->and($sale->subtotal)->toBe(1800.0) // 2 * 900
        ->and($sale->discount_amount)->toBe(180.0) // 10% of 1800
        ->and($sale->total_amount)->toBe(1620.0);
});

test('a per-item percentage discount and an invoice-level flat discount combine correctly', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500]);

    // Item-level: 20% off the 500 selling price -> unit_price 400 (SaleTotals
    // derives this from discount_type/discount_value, the supplied unit_price
    // is ignored). Invoice-level: a flat 150 off the post-item-discount subtotal.
    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'draft',
        'discount_type' => 'flat',
        'discount_value' => 150,
        'items' => [
            [
                'product_id' => $product->id,
                'quantity' => 3,
                'unit_price' => 500,
                'discount_type' => 'percentage',
                'discount_value' => 20,
            ],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    $item = $sale->items()->first();

    expect($item->discount_type->value)->toBe('percentage')
        ->and($item->discount_value)->toBe(20.0)
        ->and($item->unit_price)->toBe(400.0)
        ->and($item->discount_amount)->toBe(100.0) // 500 - 400 per unit
        ->and($sale->subtotal)->toBe(1200.0) // 3 * 400
        ->and($sale->discount_amount)->toBe(150.0) // flat 150 off 1200
        ->and($sale->total_amount)->toBe(1050.0)
        ->and($sale->due_amount)->toBe(1050.0);
});

test('a historical record skips stock, ledger, and account effects', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id, 'source' => 'imported']);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 200]);
    $sale->forceFill(['total_amount' => 200, 'due_amount' => 200])->save();

    $this->post("/sales/{$sale->id}/confirm", [])->assertRedirect();

    expect($product->fresh()->current_stock)->toBe(5.0)
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($sale->fresh()->status)->toBe(SaleStatus::Confirmed)
        ->and($sale->fresh()->payment_status->value)->toBe('paid')
        ->and(StockMovement::query()->count())->toBe(0)
        ->and(ContactLedger::query()->count())->toBe(0);
});

test('cancelling a confirmed sale reverses stock, ledger, and account effects', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 10, 'selling_price' => 100]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 300]);
    $sale->forceFill(['total_amount' => 300, 'due_amount' => 300])->save();

    $this->post("/sales/{$sale->id}/confirm", ['payments' => [['account_id' => $account->id, 'amount' => 300]]]);
    expect($product->fresh()->current_stock)->toBe(7.0);

    $this->post("/sales/{$sale->id}/cancel")->assertRedirect();

    expect($product->fresh()->current_stock)->toBe(10.0)
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(0.0)
        ->and($sale->fresh()->status)->toBe(SaleStatus::Cancelled);
});

test('cancelling a sale that already has a return against it is rejected, leaving stock, ledger, and journal untouched', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 10, 'selling_price' => 100, 'avg_cost' => 60]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 500]);
    $sale->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();

    $this->post("/sales/{$sale->id}/confirm", ['payments' => [['account_id' => $account->id, 'amount' => 500]]]);
    expect($product->fresh()->current_stock)->toBe(5.0);

    $saleItem = $sale->items()->first();

    // Partial return: only 2 of the 5 sold units come back.
    $this->post('/sale-returns', [
        'sale_id' => $sale->id,
        'return_date' => now()->toDateString(),
        'items' => [
            ['sale_item_id' => $saleItem->id, 'quantity' => 2],
        ],
    ])->assertRedirect();

    $stockAfterReturn = $product->fresh()->current_stock;
    $customerBalanceAfterReturn = $customer->fresh()->balance;
    $accountBalanceAfterReturn = $account->fresh()->current_balance;
    $journalCountAfterReturn = JournalEntry::where('reference_type', 'sale')->where('reference_id', $sale->id)->where('status', 'posted')->count();

    // Attempting to cancel the whole sale now must be rejected outright —
    // not partially reversed — since the return already reversed the
    // returned portion of stock/ledger/journal.
    $this->post("/sales/{$sale->id}/cancel")->assertSessionHasErrors('sale');

    expect($product->fresh()->current_stock)->toBe($stockAfterReturn)
        ->and($customer->fresh()->balance)->toBe($customerBalanceAfterReturn)
        ->and($account->fresh()->current_balance)->toBe($accountBalanceAfterReturn)
        ->and($sale->fresh()->status)->toBe(SaleStatus::Confirmed)
        ->and(JournalEntry::where('reference_type', 'sale')->where('reference_id', $sale->id)->where('status', 'posted')->count())->toBe($journalCountAfterReturn);
});

test('adding a payment to a confirmed sale further reduces the due', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 10, 'selling_price' => 1000]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 1000]);
    $sale->forceFill(['total_amount' => 1000, 'due_amount' => 1000])->save();

    $this->post("/sales/{$sale->id}/confirm", ['payments' => [['account_id' => $account->id, 'amount' => 400]]]);
    expect($sale->fresh()->due_amount)->toBe(600.0);

    $this->post("/sales/{$sale->id}/payments", ['payments' => [['account_id' => $account->id, 'amount' => 600]]])
        ->assertRedirect();

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($sale->fresh()->payment_status->value)->toBe('paid')
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(1000.0);
});

test('warranty_expires_at is snapshotted from the product warranty period at confirm time', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5, 'warranty_period_months' => 12]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id, 'sale_date' => '2026-01-15']);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 100]);
    $sale->forceFill(['total_amount' => 100, 'due_amount' => 100])->save();

    $this->post("/sales/{$sale->id}/confirm", []);

    expect($sale->items()->first()->warranty_expires_at->toDateString())->toBe('2027-01-15');
});

test('confirming a sale with a serial-tracked product claims the in-stock unit', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 1]);
    $serial = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-001']);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'serial_numbers' => ['SN-001']],
        ],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();

    expect($serial->fresh()->status)->toBe(SerialNumberStatus::Sold)
        ->and($serial->fresh()->sale_item_id)->toBe($sale->items()->first()->id);
});

test('confirming a sale rejects a serial that is not currently in stock', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['track_serial_number' => true, 'current_stock' => 1]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'serial_numbers' => ['SN-DOES-NOT-EXIST']],
        ],
    ]);

    expect(Sale::query()->firstOrFail()->status)->toBe(SaleStatus::Draft);
});

test('a confirmed sale cannot be edited or deleted', function () {
    $this->actingAs(User::factory()->create());
    $sale = Sale::factory()->confirmed()->create(['customer_id' => Contact::factory()]);

    $this->delete("/sales/{$sale->id}")->assertSessionHasErrors('sale');
    expect(Sale::query()->find($sale->id))->not->toBeNull();
});

test('submitting status confirmed from the Add Sale page creates and confirms in one request', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 250, 'current_stock' => 10, 'avg_cost' => 150]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-01',
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 250],
        ],
        'payments' => [['account_id' => $account->id, 'amount' => 500]],
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();

    expect($sale->status)->toBe(SaleStatus::Confirmed)
        ->and($product->fresh()->current_stock)->toBe(8.0)
        ->and($account->fresh()->current_balance)->toBe(500.0)
        ->and($sale->payment_status->value)->toBe('paid');
});

test('the customer field rejects a supplier-only contact', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create();

    $this->post('/sales', [
        'customer_id' => $supplier->id,
        'sale_date' => '2026-03-01',
        'status' => 'draft',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10]],
    ])->assertSessionHasErrors('customer_id');
});

test('waiving a contact due records a discount_waived ledger entry', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['balance' => 1000]);

    $this->post("/contacts/{$customer->id}/due-waivers", ['amount' => 200])->assertRedirect();

    expect($customer->fresh()->balance)->toBe(800.0)
        ->and(ContactLedger::query()->where('type', ContactLedgerType::DiscountWaived)->count())->toBe(1);
});
