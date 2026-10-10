<?php

use App\Enums\SaleStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SerialNumber;
use App\Models\Settings;
use Illuminate\Support\Facades\Artisan;

/*
 * The whole money chain, end to end, through the real endpoints: buy stock, sell it, then edit / cancel / correct the
 * documents in awkward ways. Whatever is done, every ledger must still agree with the books — the nightly reconciliation
 * must come back completely clean — and a refused entry must leave nothing behind.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(userWithPermissions([
        'sale.view_all', 'sale.create', 'sale.edit', 'sale.delete', 'purchase.view_all', 'purchase.create', 'purchase.edit',
        'account.create', 'account.view', 'contact.view', 'product.view',
    ]));

    // A real account (with its opening entry), a real supplier and customer, and stock that arrived through a purchase.
    $this->post('/accounts', ['name' => 'Cash Box', 'account_type_id' => AccountType::factory()->create(['name' => 'Cash'])->id, 'opening_balance' => 100000])->assertSessionHasNoErrors();
    $this->account = Account::query()->where('name', 'Cash Box')->firstOrFail();
    $this->supplier = Contact::factory()->supplier()->create();
    $this->customer = Contact::factory()->create(['type' => 'customer']);
    $this->product = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 0, 'selling_price' => 100]);

    $this->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $this->product->id, 'quantity' => 100, 'unit_price' => 50]],
        'payments' => [['account_id' => $this->account->id, 'amount' => 5000]],
    ])->assertSessionHasNoErrors();
    $this->purchase = Purchase::query()->latest('id')->firstOrFail();
});

function cleanBooks(): void
{
    Artisan::call('reconciliation:check');
    $output = Artisan::output();

    expect($output)->not->toContain('mismatch')->not->toContain('problem(s)')->toContain('Journal entries balanced: OK');
}

function sellOnce(object $t, float $qty, float $price, float $paid, array $extra = []): Sale
{
    $t->post('/sales', [
        'customer_id' => $t->customer->id,
        'sale_date' => now()->toDateString(),
        'status' => 'confirmed',
        'items' => [['product_id' => $t->product->id, 'quantity' => $qty, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $t->account->id, 'amount' => $paid]] : [],
        ...$extra,
    ])->assertSessionHasNoErrors();

    return Sale::query()->latest('id')->firstOrFail();
}

function saleForm(object $t, float $qty, float $price, float $paid, array $extra = []): array
{
    return [
        'customer_id' => $t->customer->id,
        'sale_date' => now()->toDateString(),
        'status' => 'confirmed',
        'amend_reason' => 'correction',
        'items' => [['product_id' => $t->product->id, 'quantity' => $qty, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $t->account->id, 'amount' => $paid]] : [],
        ...$extra,
    ];
}

test('a plain buy-and-sell leaves the books clean (the baseline for everything below)', function () {
    sellOnce($this, 10, 100, 1000);
    cleanBooks();
});

test('amending a sale many times, with fractional quantities and prices, keeps every ledger in agreement', function () {
    $sale = sellOnce($this, 10, 100, 1000);

    foreach ([[2.5, 199.99, 100], [7, 33.33, 0], [0.75, 1234.5678, 500], [12, 100, 1200], [3, 49.995, 149.99]] as [$qty, $price, $paid]) {
        $this->patch("/sales/{$sale->id}", saleForm($this, $qty, $price, $paid))->assertSessionHasNoErrors();

        $sale->refresh();
        $expectedTotal = round(round($qty * $price, 2), 2);

        expect($sale->total_amount)->toBe($expectedTotal)
            ->and(round($sale->paid_amount + $sale->due_amount, 2))->toBe($expectedTotal)
            // Stock is the 100 bought minus what this one sale now holds — never double-counted, never leaked.
            ->and($this->product->fresh()->current_stock)->toBe(round(100 - $qty, 4))
            // What the customer owes is exactly the unpaid part of this one sale.
            ->and($this->customer->fresh()->balance)->toBe($sale->due_amount);

        cleanBooks();
    }

    expect(Sale::query()->count())->toBe(1);
});

test('amending a sale with an invoice discount and an item discount stays consistent', function () {
    $sale = sellOnce($this, 10, 100, 0);

    $this->patch("/sales/{$sale->id}", saleForm($this, 10, 100, 0, [
        'discount_type' => 'percentage',
        'discount_value' => 7.5,
        'items' => [['product_id' => $this->product->id, 'quantity' => 10, 'original_price' => 100, 'unit_price' => 100, 'discount_type' => 'flat', 'discount_value' => 10]],
    ]))->assertSessionHasNoErrors();

    // 10 × (100 − 10) = 900, less 7.5% = 832.50
    expect($sale->fresh()->total_amount)->toBe(832.5)
        ->and($this->customer->fresh()->balance)->toBe(832.5);

    cleanBooks();
});

test('overpaying a sale does not break the books — the extra is the customers credit', function () {
    $sale = sellOnce($this, 10, 100, 0);

    $this->patch("/sales/{$sale->id}", saleForm($this, 10, 100, 1500));

    cleanBooks();

    // Whatever the system chose to do with the 500 over, it must not have lost it: money in the account equals money received.
    expect((float) $this->account->fresh()->current_balance)->toBe(100000.0 - 5000.0 + 1500.0);
});

test('cancelling, then amending a purchase, then selling more all keep the books clean', function () {
    sellOnce($this, 10, 100, 1000);

    // Correct the purchase: 100 units were really 120 at 45 — the 10 sold keep their stock.
    $this->patch("/purchases/{$this->purchase->id}", [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'amend_reason' => 'wrong quantity and price',
        'items' => [['product_id' => $this->product->id, 'quantity' => 120, 'unit_price' => 45]],
        'payments' => [['account_id' => $this->account->id, 'amount' => 5000]],
    ])->assertSessionHasNoErrors();

    expect($this->product->fresh()->current_stock)->toBe(110.0);
    cleanBooks();

    sellOnce($this, 20, 100, 2000);
    cleanBooks();
});

test('correcting a purchase price after some of it was sold keeps the books clean', function () {
    sellOnce($this, 40, 100, 4000);

    $this->patch("/purchases/{$this->purchase->id}/cost", [
        'reason' => 'real price',
        'items' => [['id' => $this->purchase->items()->first()->id, 'unit_price' => 62.5]],
    ])->assertSessionHasNoErrors();

    expect($this->purchase->fresh()->total_amount)->toBe(6250.0);
    cleanBooks();
});

// ---- wrong entries are refused, and a refused entry leaves nothing behind ----------------------------------------

test('wrong sale entries are refused and the original sale is left exactly as it was', function (array $override, string $errorKey) {
    $sale = sellOnce($this, 10, 100, 1000);
    $stock = $this->product->fresh()->current_stock;
    $cash = $this->account->fresh()->current_balance;

    $this->patch("/sales/{$sale->id}", saleForm($this, 10, 100, 1000, $override))->assertSessionHasErrors($errorKey);

    expect($sale->fresh()->status)->toBe(SaleStatus::Confirmed)
        ->and($sale->fresh()->total_amount)->toBe(1000.0)
        ->and($this->product->fresh()->current_stock)->toBe($stock)
        ->and($this->account->fresh()->current_balance)->toBe($cash);

    cleanBooks();
})->with([
    'zero quantity' => [['items' => [['product_id' => 1, 'quantity' => 0, 'unit_price' => 100]]], 'items.0.quantity'],
    'negative quantity' => [['items' => [['product_id' => 1, 'quantity' => -3, 'unit_price' => 100]]], 'items.0.quantity'],
    'negative price' => [['items' => [['product_id' => 1, 'quantity' => 1, 'unit_price' => -5]]], 'items.0.unit_price'],
    'no lines at all' => [['items' => []], 'items'],
    'a product that does not exist' => [['items' => [['product_id' => 999999, 'quantity' => 1, 'unit_price' => 100]]], 'items.0.product_id'],
    'no reason' => [['amend_reason' => ''], 'amend_reason'],
    'a payment of zero' => [['payments' => [['account_id' => 1, 'amount' => 0]]], 'payments.0.amount'],
    'a payment into an account that does not exist' => [['payments' => [['account_id' => 999999, 'amount' => 100]]], 'payments.0.account_id'],
]);

test('selling more than is in stock is refused on amendment and nothing changes', function () {
    $sale = sellOnce($this, 10, 100, 1000);

    $this->patch("/sales/{$sale->id}", saleForm($this, 101, 100, 0))->assertSessionHasErrors();

    expect($this->product->fresh()->current_stock)->toBe(90.0)
        ->and($sale->fresh()->total_amount)->toBe(1000.0);
    cleanBooks();
});

test('wrong purchase entries are refused and the original purchase is left exactly as it was', function (array $override, string $errorKey) {
    $stock = $this->product->fresh()->current_stock;

    $this->patch("/purchases/{$this->purchase->id}", [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'amend_reason' => 'correction',
        'items' => [['product_id' => $this->product->id, 'quantity' => 100, 'unit_price' => 50]],
        'payments' => [['account_id' => $this->account->id, 'amount' => 5000]],
        ...$override,
    ])->assertSessionHasErrors($errorKey);

    expect($this->purchase->fresh()->total_amount)->toBe(5000.0)
        ->and($this->product->fresh()->current_stock)->toBe($stock);
    cleanBooks();
})->with([
    'zero quantity' => [['items' => [['product_id' => 1, 'quantity' => 0, 'unit_price' => 50]]], 'items.0.quantity'],
    'negative price' => [['items' => [['product_id' => 1, 'quantity' => 5, 'unit_price' => -1]]], 'items.0.unit_price'],
    'no reason' => [['amend_reason' => ''], 'amend_reason'],
    'paying more than the total' => [['payments' => [['account_id' => 1, 'amount' => 9999]]], 'payments'],
]);

test('correcting a price to nonsense is refused', function (mixed $price) {
    $this->patch("/purchases/{$this->purchase->id}/cost", [
        'reason' => 'x',
        'items' => [['id' => $this->purchase->items()->first()->id, 'unit_price' => $price]],
    ])->assertSessionHasErrors();

    expect($this->purchase->fresh()->total_amount)->toBe(5000.0);
    cleanBooks();
})->with([-5, 'abc', '']);

test('a price correction cannot name a line that belongs to another purchase', function () {
    $other = Purchase::factory()->received()->create();
    $foreignItem = $other->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 1, 'original_price' => 1, 'subtotal' => 1]);

    $this->patch("/purchases/{$this->purchase->id}/cost", ['reason' => 'x', 'items' => [['id' => $foreignItem->id, 'unit_price' => 999]]])
        ->assertSessionHasErrors('items.0.id');
});

test('an EMI sale amended keeps its installments equal to what is financed and the books clean', function () {
    $emi = [
        'financing_type' => 'emi',
        'emi_interest_method' => 'flat',
        'emi_annual_rate' => 12,
        'emi_tenure_value' => 6,
        'emi_tenure_unit' => 'months',
        'emi_frequency' => 'monthly',
    ];

    $sale = sellOnce($this, 10, 100, 200, $emi);   // 1000 on EMI, 200 down

    $this->patch("/sales/{$sale->id}", saleForm($this, 20, 100, 500, $emi))->assertSessionHasNoErrors();

    $sale->refresh();
    $financed = round(20 * 100 - 500, 2);   // goods less the down payment; interest comes on top
    $installments = $sale->emiInstallments()->where('status', '!=', 'cancelled')->get();

    expect($installments)->toHaveCount(6)
        // principal across the plan is exactly what is financed — no installment of the old plan survives.
        ->and(round($installments->sum('principal_amount'), 2))->toBe($financed)
        ->and($this->product->fresh()->current_stock)->toBe(80.0);

    cleanBooks();
});

test('a serial-tracked sale amended and a unit corrected keeps the books and the serials clean', function () {
    $this->product->update(['track_serial_number' => true]);
    Settings::query()->update(['serial_number_module_enabled' => true]);

    $this->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $this->product->id, 'quantity' => 3, 'unit_price' => 50]],
        'serial_numbers' => [0 => ['S1', 'S2', 'S3']],
    ])->assertSessionHasNoErrors();

    $sale = sellOnce($this, 2, 300, 600, ['items' => [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price' => 300, 'serial_numbers' => ['S1', 'S2']]]]);

    // The same two units, a new price.
    $this->patch("/sales/{$sale->id}", saleForm($this, 2, 350, 700, ['items' => [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price' => 350, 'serial_numbers' => ['S1', 'S2']]]]))
        ->assertSessionHasNoErrors();

    expect(SerialNumber::query()->whereIn('serial_number', ['S1', 'S2'])->where('status', 'sold')->count())->toBe(2)
        ->and(SerialNumber::query()->where('serial_number', 'S3')->value('status')->value)->toBe('in_stock');

    // A unit that is not in stock cannot be named, and the refusal leaves the sale as it was.
    $this->patch("/sales/{$sale->id}", saleForm($this, 1, 350, 0, ['items' => [['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 350, 'serial_numbers' => ['NOPE']]]]))
        ->assertSessionHasErrors();

    expect($sale->fresh()->total_amount)->toBe(700.0)
        ->and(SerialNumber::query()->where('status', 'sold')->count())->toBe(2);

    cleanBooks();
});

test('cancelling an amended sale puts everything back', function () {
    $sale = sellOnce($this, 10, 100, 1000);
    $this->patch("/sales/{$sale->id}", saleForm($this, 25, 80, 500))->assertSessionHasNoErrors();

    $this->post("/sales/{$sale->id}/cancel")->assertSessionHasNoErrors();

    expect($sale->fresh()->status)->toBe(SaleStatus::Cancelled)
        ->and($this->product->fresh()->current_stock)->toBe(100.0)
        ->and($this->customer->fresh()->balance)->toBe(0.0)
        ->and($this->account->fresh()->current_balance)->toBe(100000.0 - 5000.0);

    cleanBooks();
});
