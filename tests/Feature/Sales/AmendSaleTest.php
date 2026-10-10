<?php

use App\Enums\JournalEntryStatus;
use App\Enums\SaleStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use Illuminate\Support\Facades\Artisan;

/*
 * Editing a Confirmed sale = reverse it and record the corrected version on the same invoice, in one transaction.
 * Every ledger must still agree afterwards, and a failed amendment must leave the original sale exactly as it was.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.create', 'sale.edit', 'contact.view']));
    $this->account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);
    $this->customer = Contact::factory()->create(['type' => 'customer']);
    $this->product = Product::factory()->create(['selling_price' => 200, 'current_stock' => 10, 'avg_cost' => 120]);
});

/** A confirmed sale made the normal way: quantity × price, paid in full unless told otherwise. */
function amendableConfirmedSale(object $test, float $quantity = 4, float $price = 200, ?float $paid = null): Sale
{
    $paid ??= $quantity * $price;

    $test->post('/sales', [
        'customer_id' => $test->customer->id,
        'sale_date' => now()->toDateString(),
        'status' => 'confirmed',
        'items' => [['product_id' => $test->product->id, 'quantity' => $quantity, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $test->account->id, 'amount' => $paid]] : [],
    ])->assertSessionHasNoErrors();

    return Sale::query()->latest('id')->firstOrFail();
}

/** The corrected form, as the edit page would send it. */
function amendmentForm(object $test, Sale $sale, float $quantity, float $price, float $paid, array $overrides = []): array
{
    return [
        'customer_id' => $test->customer->id,
        'sale_date' => now()->toDateString(),
        'status' => 'confirmed',
        'amend_reason' => 'Price was typed wrong',
        'items' => [['product_id' => $test->product->id, 'quantity' => $quantity, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $test->account->id, 'amount' => $paid]] : [],
        ...$overrides,
    ];
}

test('amending quantity and price keeps the invoice and re-balances stock, customer, account and journal', function () {
    $sale = amendableConfirmedSale($this);
    $invoice = $sale->invoice_no;

    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 3, 250, 750))->assertSessionHasNoErrors();

    $sale->refresh();

    expect($sale->invoice_no)->toBe($invoice)
        ->and($sale->status)->toBe(SaleStatus::Confirmed)
        ->and($sale->total_amount)->toBe(750.0)
        ->and($sale->paid_amount)->toBe(750.0)
        ->and($sale->due_amount)->toBe(0.0)
        ->and($this->product->fresh()->current_stock)->toBe(7.0)
        ->and($this->customer->fresh()->balance)->toBe(0.0)
        ->and($this->account->fresh()->current_balance)->toBe(750.0)
        ->and(Sale::query()->count())->toBe(1);

    // The books agree. (The test product is created with stock but no opening movement, so the Inventory and
    // stock-movement lines of the check are not meaningful here; the money side is.)
    Artisan::call('reconciliation:check');
    expect(Artisan::output())
        ->toContain('Accounts Receivable: reconciled')
        ->toContain('Journal entries balanced: OK')
        ->toContain('Payment account balances: OK')
        ->toContain('Account register vs journal: OK');

    // The original sale's entries are reversed, not deleted — the history is still there.
    expect(JournalEntry::query()->where('status', JournalEntryStatus::Reversed)->exists())->toBeTrue();
});

test('amending to a smaller payment leaves the difference as the customers due', function () {
    $sale = amendableConfirmedSale($this);

    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 4, 200, 500))->assertSessionHasNoErrors();

    expect($sale->fresh()->due_amount)->toBe(300.0)
        ->and($this->customer->fresh()->balance)->toBe(300.0)
        ->and($this->account->fresh()->current_balance)->toBe(500.0);
});

test('changing the customer moves the due from the old customer to the new one', function () {
    $sale = amendableConfirmedSale($this, 4, 200, 0);
    $other = Contact::factory()->create(['type' => 'customer']);

    expect($this->customer->fresh()->balance)->toBe(800.0);

    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 4, 200, 0, ['customer_id' => $other->id]))->assertSessionHasNoErrors();

    expect($this->customer->fresh()->balance)->toBe(0.0)
        ->and($other->fresh()->balance)->toBe(800.0);
});

test('an amendment needs a reason', function () {
    $sale = amendableConfirmedSale($this);

    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 3, 250, 750, ['amend_reason' => '']))->assertSessionHasErrors('amend_reason');

    expect($sale->fresh()->total_amount)->toBe(800.0);
});

test('not enough stock rolls everything back to the original sale', function () {
    $sale = amendableConfirmedSale($this);

    // 4 are sold, 6 left; asking for 20 cannot be confirmed.
    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 20, 200, 0))->assertSessionHasErrors();

    expect($sale->fresh()->status)->toBe(SaleStatus::Confirmed)
        ->and($sale->fresh()->total_amount)->toBe(800.0)
        ->and($this->product->fresh()->current_stock)->toBe(6.0)
        ->and($this->account->fresh()->current_balance)->toBe(800.0);
});

test('a sale with a return can no longer be amended', function () {
    $sale = amendableConfirmedSale($this);
    $this->post('/sale-returns', [
        'sale_id' => $sale->id,
        'return_date' => now()->toDateString(),
        'items' => [['sale_item_id' => $sale->items()->first()->id, 'quantity' => 1]],
    ])->assertSessionHasNoErrors();

    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 3, 250, 750))->assertSessionHasErrors('sale');
    $this->get("/sales/{$sale->id}/edit")->assertForbidden();

    expect($sale->fresh()->total_amount)->toBe(800.0);
});

test('the edit page of a confirmed sale starts from what was received', function () {
    $sale = amendableConfirmedSale($this, 4, 200, 500);

    $this->get("/sales/{$sale->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('sale.amending', true)
            ->where('sale.payments.0.account_id', $this->account->id)
            ->where('sale.payments.0.amount', 500));
});

test('amending needs the sale edit permission', function () {
    $sale = amendableConfirmedSale($this);

    $this->actingAs(userWithPermissions(['sale.view_all', 'sale.create']))
        ->get("/sales/{$sale->id}/edit")
        ->assertForbidden();
});

test('units sold again keep the cost they were first sold at, even if the average cost has moved', function () {
    $sale = amendableConfirmedSale($this);   // 4 units sold at the product's cost of 120
    expect((float) $sale->items()->first()->cost_at_sale)->toBe(120.0);

    $this->product->forceFill(['avg_cost' => 150])->save();   // the average cost has risen since

    // Same quantity, new price: the profit moves only through the price, not through today's cost.
    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 4, 250, 1000))->assertSessionHasNoErrors();
    expect((float) $sale->items()->first()->cost_at_sale)->toBe(120.0);

    // Two more units than before: the original four keep 120, the two new ones take today's 150.
    $this->patch("/sales/{$sale->id}", amendmentForm($this, $sale, 6, 250, 1500))->assertSessionHasNoErrors();
    expect((float) $sale->items()->first()->cost_at_sale)->toBe(130.0);
});
