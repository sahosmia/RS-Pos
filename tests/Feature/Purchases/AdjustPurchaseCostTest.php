<?php

use App\Enums\JournalEntryStatus;
use App\Enums\SerialNumberStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\JournalEntryLine;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\SerialNumber;
use App\Models\Settings;
use Illuminate\Support\Facades\Artisan;

/*
 * Correcting only the PRICE of a received purchase: units, stock and serials stay as they are, so it works even when
 * part of the goods is already sold. Only the money moves, in one adjustment entry.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(userWithPermissions(['purchase.view_all', 'purchase.create', 'purchase.edit']));
    $this->account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 10000]);
    $this->supplier = Contact::factory()->supplier()->create();
    $this->product = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 0]);
});

function pricedPurchase(object $test, float $quantity = 5, float $price = 400, float $paid = 0, array $extra = []): Purchase
{
    $test->post('/purchases', [
        'supplier_id' => $test->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $test->product->id, 'quantity' => $quantity, 'unit_price' => $price]],
        'payments' => $paid > 0 ? [['account_id' => $test->account->id, 'amount' => $paid]] : [],
        ...$extra,
    ])->assertSessionHasNoErrors();

    return Purchase::query()->latest('id')->firstOrFail();
}

function adjustCost(object $test, Purchase $purchase, float $price, string $reason = 'Price was typed wrong'): mixed
{
    return $test->patch("/purchases/{$purchase->id}/cost", [
        'reason' => $reason,
        'items' => [['id' => $purchase->items()->first()->id, 'unit_price' => $price]],
    ]);
}

test('correcting the price of an unsold purchase moves payable, inventory and the average cost', function () {
    $purchase = pricedPurchase($this);   // 5 × 400 = 2000, owed

    adjustCost($this, $purchase, 500)->assertSessionHasNoErrors();   // 5 × 500 = 2500

    $purchase->refresh();

    expect($purchase->total_amount)->toBe(2500.0)
        ->and($purchase->due_amount)->toBe(2500.0)
        ->and($this->supplier->fresh()->balance)->toBe(-2500.0)
        ->and($this->product->fresh()->current_stock)->toBe(5.0)
        ->and($this->product->fresh()->avg_cost)->toBe(500.0);

    Artisan::call('reconciliation:check');
    expect(Artisan::output())
        ->toContain('Accounts Payable: reconciled')
        ->toContain('Inventory: reconciled')
        ->toContain('Journal entries balanced: OK')
        ->toContain('Product stock vs movements: OK');
});

test('part of the difference belongs to the units already sold and goes to cost of goods sold', function () {
    $purchase = pricedPurchase($this);   // 5 × 400
    $this->product->forceFill(['current_stock' => 2])->save();   // 3 of them have been sold

    adjustCost($this, $purchase, 500)->assertSessionHasNoErrors();   // +100 per unit: 2 held, 3 sold

    expect($purchase->fresh()->total_amount)->toBe(2500.0)
        // Only the 2 units still on the shelf carry the dearer cost: 400 + 2×100/2 = 500.
        ->and($this->product->fresh()->avg_cost)->toBe(500.0)
        ->and($this->product->fresh()->current_stock)->toBe(2.0);

    // Debit COGS 300 (3 sold × 100) and Inventory 200 (2 held × 100), credit Payables 500, all in one balanced entry.
    $cogs = JournalEntryLine::query()
        ->whereHas('chartOfAccount', fn ($q) => $q->where('code', '5100'))
        ->whereHas('journalEntry', fn ($q) => $q->where('reference_id', $purchase->id)->where('status', JournalEntryStatus::Posted))
        ->sum('debit');

    expect((float) $cogs)->toBe(300.0);
});

test('lowering the price lowers what is owed, and cannot drop below what is already paid', function () {
    $purchase = pricedPurchase($this, 5, 400, 1500);   // owes 500

    adjustCost($this, $purchase, 350)->assertSessionHasNoErrors();   // 1750: now owes 250

    expect($purchase->fresh()->due_amount)->toBe(250.0)
        ->and($this->supplier->fresh()->balance)->toBe(-250.0);

    adjustCost($this, $purchase, 100)->assertSessionHasErrors('items');   // 500 < 1500 already paid

    expect($purchase->fresh()->total_amount)->toBe(1750.0);
});

test('serial numbers and stock quantity are left untouched', function () {
    $this->product->update(['track_serial_number' => true]);
    $this->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'purchase_date' => now()->toDateString(),
        'status' => 'received',
        'items' => [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price' => 100]],
        'serial_numbers' => [0 => ['SN-1', 'SN-2']],
    ])->assertSessionHasNoErrors();
    $purchase = Purchase::query()->latest('id')->firstOrFail();
    SerialNumber::query()->where('serial_number', 'SN-1')->update(['status' => 'sold']);   // one is sold

    adjustCost($this, $purchase, 120)->assertSessionHasNoErrors();

    expect(SerialNumber::query()->where('serial_number', 'SN-1')->value('status'))->toBe(SerialNumberStatus::Sold)
        ->and(SerialNumber::query()->count())->toBe(2)
        ->and($purchase->fresh()->total_amount)->toBe(240.0);
});

test('a price correction needs a reason, the edit permission, and a purchase without a return', function () {
    $purchase = pricedPurchase($this);

    adjustCost($this, $purchase, 500, '')->assertSessionHasErrors('reason');

    $this->actingAs(userWithPermissions(['purchase.view_all', 'purchase.create']));
    adjustCost($this, $purchase, 500)->assertForbidden();

    expect($purchase->fresh()->total_amount)->toBe(2000.0);
});

test('an unchanged price is a no-op', function () {
    $purchase = pricedPurchase($this);
    $entries = JournalEntryLine::query()->count();

    adjustCost($this, $purchase, 400)->assertSessionHasNoErrors();

    expect(JournalEntryLine::query()->count())->toBe($entries)
        ->and($purchase->fresh()->total_amount)->toBe(2000.0);
});
