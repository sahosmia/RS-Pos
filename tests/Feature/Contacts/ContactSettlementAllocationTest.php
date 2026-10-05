<?php

use App\Enums\PaymentStatus;
use App\Enums\PurchaseStatus;
use App\Enums\SalePaymentType;
use App\Enums\SaleStatus;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

/*
 * A payment or discount entered against a contact's ledger without picking an
 * invoice is applied to their oldest unpaid invoices, so the invoices and the
 * ledger never disagree about what is still owed.
 */

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(User::factory()->create());
});

function dueSale(Contact $customer, float $total, string $date, array $overrides = []): Sale
{
    $sale = Sale::factory()->create(['customer_id' => $customer->id, 'sale_date' => $date, ...$overrides]);
    $sale->forceFill(['total_amount' => $total, 'due_amount' => $total, 'status' => SaleStatus::Confirmed])->save();

    return $sale;
}

function settlementAccount(float $balance = 0): Account
{
    return Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => $balance]);
}

test('a ledger payment with no invoice picked settles the oldest due invoices first', function () {
    $customer = Contact::factory()->create(['balance' => 50000]);
    $older = dueSale($customer, 30000, '2026-08-01');
    $newer = dueSale($customer, 20000, '2026-09-01');
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", [
        'account_id' => $account->id,
        'amount' => 40000,
        'direction' => 'received',
    ])->assertRedirect();

    expect($older->fresh()->due_amount)->toBe(0.0)
        ->and($older->fresh()->payment_status)->toBe(PaymentStatus::Paid)
        ->and($newer->fresh()->paid_amount)->toBe(10000.0)
        ->and($newer->fresh()->due_amount)->toBe(10000.0)
        ->and($newer->fresh()->payment_status)->toBe(PaymentStatus::Partial)
        ->and($customer->fresh()->balance)->toBe(10000.0)
        ->and($account->fresh()->current_balance)->toBe(40000.0);
});

test('paying the rest in a second ledger payment finishes the invoice', function () {
    $customer = Contact::factory()->create(['balance' => 50000]);
    $sale = dueSale($customer, 50000, '2026-09-01');
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 20000, 'direction' => 'received']);
    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 30000, 'direction' => 'received']);

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($sale->fresh()->paid_amount)->toBe(50000.0)
        ->and($sale->fresh()->payment_status)->toBe(PaymentStatus::Paid)
        ->and($customer->fresh()->balance)->toBe(0.0);
});

test('anything beyond the due invoices is kept as a general credit', function () {
    $customer = Contact::factory()->create(['balance' => 1000]);
    $sale = dueSale($customer, 1000, '2026-09-01');
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 1500, 'direction' => 'received'])->assertRedirect();

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($customer->fresh()->balance)->toBe(-500.0)
        ->and($account->fresh()->current_balance)->toBe(1500.0);
});

test('every journal entry a ledger payment posts is balanced', function () {
    $customer = Contact::factory()->create(['balance' => 3000]);
    dueSale($customer, 1000, '2026-08-01');
    dueSale($customer, 1000, '2026-09-01');
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 2500, 'direction' => 'received']);

    $entries = JournalEntry::query()->with('lines')->get();

    expect($entries)->toHaveCount(3)
        ->and($entries->every(fn ($entry) => $entry->lines->sum('debit') === $entry->lines->sum('credit')))->toBeTrue()
        ->and(ChartOfAccount::where('code', '1100')->firstOrFail()->balance)->toBe(-2500.0);
});

test('EMI sales and unconfirmed sales are not touched by a ledger payment', function () {
    $customer = Contact::factory()->create(['balance' => 1000]);
    $emi = dueSale($customer, 1000, '2026-08-01', ['financing_type' => SalePaymentType::Emi]);
    $draft = Sale::factory()->create(['customer_id' => $customer->id, 'status' => SaleStatus::Draft]);
    $draft->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 400, 'direction' => 'received'])->assertRedirect();

    expect($emi->fresh()->paid_amount)->toBe(0.0)
        ->and($draft->fresh()->paid_amount)->toBe(0.0)
        ->and($customer->fresh()->balance)->toBe(600.0);
});

test('paying a supplier with no purchase picked settles the oldest received purchase first', function () {
    $supplier = Contact::factory()->supplier()->create(['balance' => -5000]);
    $older = Purchase::factory()->create(['supplier_id' => $supplier->id, 'purchase_date' => '2026-08-01']);
    $older->forceFill(['total_amount' => 3000, 'due_amount' => 3000, 'status' => PurchaseStatus::Received])->save();
    $newer = Purchase::factory()->create(['supplier_id' => $supplier->id, 'purchase_date' => '2026-09-01']);
    $newer->forceFill(['total_amount' => 2000, 'due_amount' => 2000, 'status' => PurchaseStatus::Received])->save();
    $account = settlementAccount(10000);

    $this->post("/contacts/{$supplier->id}/payments", ['account_id' => $account->id, 'amount' => 3500, 'direction' => 'made'])->assertRedirect();

    expect($older->fresh()->due_amount)->toBe(0.0)
        ->and($newer->fresh()->due_amount)->toBe(1500.0)
        ->and($supplier->fresh()->balance)->toBe(-1500.0)
        ->and($account->fresh()->current_balance)->toBe(6500.0);
});

test('a discount is taken off the oldest due invoice and posts to the ledger accounts', function () {
    $customer = Contact::factory()->create(['balance' => 2000]);
    $sale = dueSale($customer, 2000, '2026-09-01');

    $this->post("/contacts/{$customer->id}/due-waivers", ['amount' => 2000])->assertRedirect();

    $entry = JournalEntry::query()->with('lines')->where('reference_type', 'sale')->where('reference_id', $sale->id)->firstOrFail();

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($sale->fresh()->paid_amount)->toBe(0.0)
        ->and($sale->fresh()->payment_status)->toBe(PaymentStatus::Paid)
        ->and($sale->fresh()->waivedAmount())->toBe(2000.0)
        ->and($customer->fresh()->balance)->toBe(0.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and(ChartOfAccount::where('code', '4150')->firstOrFail()->balance)->toBe(2000.0)
        ->and(ChartOfAccount::where('code', '1100')->firstOrFail()->balance)->toBe(-2000.0);
});

test('a discount beyond the invoices comes off the general balance', function () {
    $customer = Contact::factory()->create(['balance' => 5000]);
    $sale = dueSale($customer, 2000, '2026-09-01');

    $this->post("/contacts/{$customer->id}/due-waivers", ['amount' => 3000])->assertRedirect();

    expect($sale->fresh()->due_amount)->toBe(0.0)
        ->and($customer->fresh()->balance)->toBe(2000.0)
        ->and(ChartOfAccount::where('code', '4150')->firstOrFail()->balance)->toBe(3000.0);
});

test('a discount cannot be larger than what the contact owes', function () {
    $customer = Contact::factory()->create(['balance' => 1000]);
    $settled = Contact::factory()->create(['balance' => 0]);

    $this->post("/contacts/{$customer->id}/due-waivers", ['amount' => 1500])->assertSessionHasErrors('amount');
    $this->post("/contacts/{$settled->id}/due-waivers", ['amount' => 10])->assertSessionHasErrors('amount');

    expect($customer->fresh()->balance)->toBe(1000.0);
});

test('a customer\'s credit can be refunded from an account', function () {
    $customer = Contact::factory()->create(['balance' => -3000]);
    $account = settlementAccount(10000);

    $this->post("/contacts/{$customer->id}/refunds", ['account_id' => $account->id, 'amount' => 1200, 'note' => 'Returned advance'])->assertRedirect();

    $entry = JournalEntry::query()->with('lines')->where('reference_type', 'contact')->where('reference_id', $customer->id)->firstOrFail();

    expect($customer->fresh()->balance)->toBe(-1800.0)
        ->and($account->fresh()->current_balance)->toBe(8800.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and(ChartOfAccount::where('code', '1100')->firstOrFail()->balance)->toBe(1200.0);
});

test('refunding the whole credit brings the customer back to zero', function () {
    $customer = Contact::factory()->create(['balance' => -500]);
    $account = settlementAccount(1000);

    $this->post("/contacts/{$customer->id}/refunds", ['account_id' => $account->id, 'amount' => 500])->assertRedirect();

    expect($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(500.0);
});

test('a refund cannot be more than the customer\'s credit', function () {
    $owing = Contact::factory()->create(['balance' => 800]);
    $credited = Contact::factory()->create(['balance' => -300]);
    $account = settlementAccount(10000);

    $this->post("/contacts/{$owing->id}/refunds", ['account_id' => $account->id, 'amount' => 100])->assertSessionHasErrors('amount');
    $this->post("/contacts/{$credited->id}/refunds", ['account_id' => $account->id, 'amount' => 500])->assertSessionHasErrors('amount');

    expect($account->fresh()->current_balance)->toBe(10000.0)
        ->and($credited->fresh()->balance)->toBe(-300.0);
});

test('a refund cannot be paid from an account that does not hold enough', function () {
    $customer = Contact::factory()->create(['balance' => -2000]);
    $account = settlementAccount(500);

    $this->post("/contacts/{$customer->id}/refunds", ['account_id' => $account->id, 'amount' => 1000])->assertSessionHasErrors();

    expect($customer->fresh()->balance)->toBe(-2000.0)
        ->and($account->fresh()->current_balance)->toBe(500.0);
});

test('only a customer can be refunded', function () {
    $supplier = Contact::factory()->supplier()->create(['balance' => -1000]);
    $account = settlementAccount(5000);

    $this->post("/contacts/{$supplier->id}/refunds", ['account_id' => $account->id, 'amount' => 100])->assertSessionHasErrors('amount');

    expect($account->fresh()->current_balance)->toBe(5000.0);
});

test('an overpayment followed by a refund leaves Receivable at zero', function () {
    $customer = Contact::factory()->create(['balance' => 1000]);
    dueSale($customer, 1000, '2026-09-01');
    $account = settlementAccount();

    $this->post("/contacts/{$customer->id}/payments", ['account_id' => $account->id, 'amount' => 1500, 'direction' => 'received']);

    expect($customer->fresh()->balance)->toBe(-500.0);

    $this->post("/contacts/{$customer->id}/refunds", ['account_id' => $account->id, 'amount' => 500])->assertRedirect();

    expect($customer->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(1000.0)
        ->and(ChartOfAccount::where('code', '1100')->firstOrFail()->balance)->toBe(-1000.0);
});

test('cancelling a sale that had a discount waived leaves the ledger and accounts at zero', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'current_stock' => 5, 'avg_cost' => 600]);
    $sale = Sale::factory()->create(['customer_id' => $customer->id]);
    $sale->items()->create(['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 1000, 'original_price' => 1000, 'subtotal' => 2000]);
    $sale->forceFill(['total_amount' => 2000, 'due_amount' => 2000])->save();

    $this->post("/sales/{$sale->id}/confirm", [])->assertRedirect();
    $this->post("/contacts/{$customer->id}/due-waivers", ['amount' => 500])->assertRedirect();

    expect($sale->fresh()->due_amount)->toBe(1500.0)
        ->and($customer->fresh()->balance)->toBe(1500.0);

    $this->post("/sales/{$sale->id}/cancel")->assertRedirect();

    expect($customer->fresh()->balance)->toBe(0.0)
        ->and(ChartOfAccount::where('code', '1100')->firstOrFail()->balance)->toBe(0.0)
        ->and(ChartOfAccount::where('code', '4150')->firstOrFail()->balance)->toBe(0.0);
});
