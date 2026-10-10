<?php

use App\Enums\PurchaseStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\SerialNumber;
use App\Models\Settings;
use Illuminate\Support\Facades\Artisan;

/*
 * Editing a Received purchase = take the receipt out and receive the corrected one on the same invoice, in one
 * transaction. Stock, supplier payable, payments, journal and the product's average cost must all come out right, and
 * a failed amendment must leave the original purchase exactly as it was.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(userWithPermissions(['purchase.view_all', 'purchase.create', 'purchase.edit', 'sale.view_all', 'sale.create']));
    $this->account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 10000]);
    $this->supplier = Contact::factory()->supplier()->create();
    $this->product = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 0, 'selling_price' => 300]);
});

/** A received purchase made the normal way: quantity × price, paid in full unless told otherwise. */
function amendableReceivedPurchase(object $test, float $quantity = 10, float $price = 100, ?float $paid = null): Purchase
{
    $paid ??= $quantity * $price;

    $test->post('/purchases', [
        'supplier_id' => $test->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $test->product->id, 'quantity' => $quantity, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $test->account->id, 'amount' => $paid]] : [],
    ])->assertSessionHasNoErrors();

    return Purchase::query()->latest('id')->firstOrFail();
}

function purchaseAmendmentForm(object $test, float $quantity, float $price, float $paid, array $overrides = []): array
{
    return [
        'supplier_id' => $test->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'amend_reason' => 'Price was typed wrong',
        'items' => [['product_id' => $test->product->id, 'quantity' => $quantity, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $test->account->id, 'amount' => $paid]] : [],
        ...$overrides,
    ];
}

test('amending quantity and price keeps the invoice and re-balances stock, supplier, account and average cost', function () {
    $purchase = amendableReceivedPurchase($this);
    $invoice = $purchase->invoice_no;

    expect($this->product->fresh()->avg_cost)->toBe(100.0);

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 8, 90, 720))->assertSessionHasNoErrors();

    $purchase->refresh();

    expect($purchase->invoice_no)->toBe($invoice)
        ->and($purchase->status)->toBe(PurchaseStatus::Received)
        ->and($purchase->total_amount)->toBe(720.0)
        ->and($purchase->paid_amount)->toBe(720.0)
        ->and($purchase->due_amount)->toBe(0.0)
        ->and($this->product->fresh()->current_stock)->toBe(8.0)
        // The old batch's price is out of the average: only the corrected batch is in it.
        ->and($this->product->fresh()->avg_cost)->toBe(90.0)
        ->and($this->supplier->fresh()->balance)->toBe(0.0)
        ->and($this->account->fresh()->current_balance)->toBe(9280.0)
        ->and(Purchase::query()->count())->toBe(1);

    // (The test account is created with a balance but no opening transaction, so the register check is left out.)
    Artisan::call('reconciliation:check');
    expect(Artisan::output())
        ->toContain('Accounts Payable: reconciled')
        ->toContain('Inventory: reconciled')
        ->toContain('Journal entries balanced: OK')
        ->toContain('Product stock vs movements: OK');
});

test('amending to a smaller payment leaves the difference owed to the supplier', function () {
    $purchase = amendableReceivedPurchase($this);

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 10, 100, 400))->assertSessionHasNoErrors();

    expect($purchase->fresh()->due_amount)->toBe(600.0)
        ->and($this->supplier->fresh()->balance)->toBe(-600.0)
        ->and($this->account->fresh()->current_balance)->toBe(9600.0);
});

test('the average cost blends correctly with stock that was already there', function () {
    $this->product->forceFill(['current_stock' => 10, 'avg_cost' => 50])->save();
    $purchase = amendableReceivedPurchase($this, 10, 100, 0);   // 20 units: (10×50 + 10×100) / 20 = 75

    expect($this->product->fresh()->avg_cost)->toBe(75.0);

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 10, 150, 0))->assertSessionHasNoErrors();

    // Back to the 10 units at 50, then the corrected 10 at 150: (10×50 + 10×150) / 20 = 100.
    expect($this->product->fresh()->current_stock)->toBe(20.0)
        ->and($this->product->fresh()->avg_cost)->toBe(100.0);
});

test('the quantity cannot drop below what was already sold from it', function () {
    $purchase = amendableReceivedPurchase($this);
    $this->product->forceFill(['current_stock' => 3])->save();   // 7 of the 10 have been sold

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 5, 100, 0))->assertSessionHasErrors('items');

    // Nothing changed.
    expect($purchase->fresh()->total_amount)->toBe(1000.0)
        ->and($this->product->fresh()->current_stock)->toBe(3.0);
});

test('the quantity can drop as long as it still covers what was sold', function () {
    $purchase = amendableReceivedPurchase($this);
    $this->product->forceFill(['current_stock' => 3])->save();   // 7 sold, 3 left

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 9, 100, 0))->assertSessionHasNoErrors();

    expect($this->product->fresh()->current_stock)->toBe(2.0);
});

test('serial numbers that were already sold block the amendment', function () {
    $this->product->update(['track_serial_number' => true]);
    $this->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price' => 100]],
        'serial_numbers' => [0 => ['SN-1', 'SN-2']],
    ])->assertSessionHasNoErrors();
    $purchase = Purchase::query()->latest('id')->firstOrFail();

    SerialNumber::query()->where('serial_number', 'SN-1')->update(['status' => 'sold']);

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 2, 80, 0, ['serial_numbers' => [0 => ['SN-1', 'SN-2']]]))
        ->assertSessionHasErrors('purchase');

    expect($purchase->fresh()->total_amount)->toBe(200.0)
        ->and($this->product->fresh()->current_stock)->toBe(2.0);
});

test('an amendment needs a reason', function () {
    $purchase = amendableReceivedPurchase($this);

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 8, 90, 720, ['amend_reason' => '']))->assertSessionHasErrors('amend_reason');

    expect($purchase->fresh()->total_amount)->toBe(1000.0);
});

test('a purchase with a return can no longer be amended', function () {
    $purchase = amendableReceivedPurchase($this);
    $this->post('/purchase-returns', [
        'purchase_id' => $purchase->id,
        'return_date' => now()->toDateString(),
        'items' => [['purchase_item_id' => $purchase->items()->first()->id, 'quantity' => 1]],
    ])->assertSessionHasNoErrors();

    $this->patch("/purchases/{$purchase->id}", purchaseAmendmentForm($this, 8, 90, 720))->assertSessionHasErrors('purchase');
    $this->get("/purchases/{$purchase->id}/edit")->assertForbidden();
});

test('the edit page of a received purchase starts from what was paid', function () {
    $purchase = amendableReceivedPurchase($this, 10, 100, 400);

    $this->get("/purchases/{$purchase->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('purchase.amending', true)
            ->where('purchase.paid_amount', 0)
            ->where('purchase.payments.0.account_id', $this->account->id)
            ->where('purchase.payments.0.amount', 400));
});

test('amending needs the purchase edit permission', function () {
    $purchase = amendableReceivedPurchase($this);

    $this->actingAs(userWithPermissions(['purchase.view_all', 'purchase.create']))
        ->get("/purchases/{$purchase->id}/edit")
        ->assertForbidden();
});

test('cancelling a purchase gives its price back out of the average cost', function () {
    $this->product->forceFill(['current_stock' => 10, 'avg_cost' => 50])->save();
    $purchase = amendableReceivedPurchase($this, 10, 100, 0);

    expect($this->product->fresh()->avg_cost)->toBe(75.0);

    $this->post("/purchases/{$purchase->id}/cancel")->assertSessionHasNoErrors();

    expect($this->product->fresh()->current_stock)->toBe(10.0)
        ->and($this->product->fresh()->avg_cost)->toBe(50.0);
});
