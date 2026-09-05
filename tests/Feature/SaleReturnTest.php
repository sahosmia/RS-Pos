<?php

use App\Actions\Sale\ConfirmSaleAction;
use App\Actions\SaleReturn\CreateSaleReturnAction;
use App\Actions\SaleReturn\RefundSaleReturnAction;
use App\Enums\SerialNumberStatus;
use App\Exceptions\ReturnQuantityExceedsRemainingException;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SerialNumber;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

function confirmedSale(Contact $customer, Product $product, float $quantity, float $unitPrice): Sale
{
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create([
        'product_id' => $product->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'original_price' => $unitPrice,
        'subtotal' => $quantity * $unitPrice,
    ]);
    $sale->forceFill(['total_amount' => $quantity * $unitPrice, 'due_amount' => $quantity * $unitPrice])->save();

    return app(ConfirmSaleAction::class)->execute($sale);
}

test('creating a sale return increases stock, reduces the customer due, and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5, 'avg_cost' => 60]);
    $sale = confirmedSale($customer, $product, 2, 100);

    expect($product->fresh()->current_stock)->toBe(3.0)
        ->and($customer->fresh()->balance)->toBe(200.0);

    $saleItem = $sale->items()->firstOrFail();

    $return = app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'reason' => 'Damaged',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 1]],
    ]);

    expect($product->fresh()->current_stock)->toBe(4.0)
        ->and($customer->fresh()->balance)->toBe(100.0)
        ->and($return->total_amount)->toBe(100.0);

    $entry = JournalEntry::where('reference_type', 'sale_return')->where('reference_id', $return->id)->firstOrFail();
    $returnsAllowances = ChartOfAccount::where('code', '4150')->firstOrFail();
    $receivable = ChartOfAccount::where('code', '1100')->firstOrFail();
    $inventory = ChartOfAccount::where('code', '1200')->firstOrFail();
    $cogs = ChartOfAccount::where('code', '5100')->firstOrFail();

    // Sale was 2 units @ cost 60 (COGS 120); only 1 unit came back (COGS reversal 60).
    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($returnsAllowances->fresh()->balance)->toBe(100.0)
        ->and($inventory->fresh()->balance)->toBe(-60.0)
        ->and($cogs->fresh()->balance)->toBe(60.0);

    // Sanity: receivable moved by the sale (+200) then the return (-100).
    expect($receivable->fresh()->balance)->toBe(100.0);
});

test('returning more than was sold throws, even when called directly on the action', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);
    $sale = confirmedSale($customer, $product, 2, 100);
    $saleItem = $sale->items()->firstOrFail();

    $attempt = fn () => app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 3]],
    ]);

    expect($attempt)->toThrow(ReturnQuantityExceedsRemainingException::class)
        ->and(SaleReturn::query()->count())->toBe(0);
});

test('a second return respects what the first return already used up', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);
    $sale = confirmedSale($customer, $product, 3, 100);
    $saleItem = $sale->items()->firstOrFail();

    app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 2]],
    ]);

    $attempt = fn () => app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-06',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 2]],
    ]);

    expect($attempt)->toThrow(ReturnQuantityExceedsRemainingException::class);
});

test('the store endpoint rejects a return against a draft sale', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $saleItem = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 100]);

    $this->post('/sale-returns', [
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 1]],
    ])->assertSessionHasErrors('sale_id');
});

test('a serial-tracked return marks the sold unit as returned', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 1, 'track_serial_number' => true]);
    $serial = SerialNumber::factory()->create(['product_id' => $product->id, 'serial_number' => 'SN-RET-1']);

    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $saleItem = $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 500, 'original_price' => 500, 'subtotal' => 500]);
    $sale->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();
    app(ConfirmSaleAction::class)->execute($sale, [], [$saleItem->id => ['SN-RET-1']]);

    app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 1]],
    ]);

    expect($serial->fresh()->status)->toBe(SerialNumberStatus::Returned);
});

test('refunding a sale return that was already fully paid settles the customer back to zero', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5, 'avg_cost' => 60]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 200, 'original_price' => 200, 'subtotal' => 200]);
    $sale->forceFill(['total_amount' => 200, 'due_amount' => 200])->save();
    app(ConfirmSaleAction::class)->execute($sale, [['account_id' => $account->id, 'amount' => 200]]);

    expect($customer->fresh()->balance)->toBe(0.0);

    $saleItem = $sale->items()->firstOrFail();
    $return = app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 1]],
    ]);

    // The full-value return with nothing further owed pushes the customer into credit.
    expect($customer->fresh()->balance)->toBe(-200.0);

    app(RefundSaleReturnAction::class)->execute($return, [['account_id' => $account->id, 'amount' => 200]]);

    expect($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(0.0);

    $refundEntry = JournalEntry::where('reference_type', 'sale_return_refund')->where('reference_id', $return->id)->firstOrFail();
    expect($refundEntry->lines->sum('debit'))->toBe($refundEntry->lines->sum('credit'));
});

test('sale returns and refund pages render', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['current_stock' => 5]);
    $sale = confirmedSale($customer, $product, 2, 100);
    $saleItem = $sale->items()->firstOrFail();

    $this->get("/sale-returns/create?sale_id={$sale->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sale-returns/create')->has('sale.items', 1));

    $return = app(CreateSaleReturnAction::class)->execute([
        'sale_id' => $sale->id,
        'return_date' => '2026-03-05',
        'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 1]],
    ]);

    $this->get('/sale-returns')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sale-returns/index')->has('returns.data', 1));

    $this->get("/sale-returns/{$return->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('sale-returns/show')->where('return.total_amount', 100));
});
