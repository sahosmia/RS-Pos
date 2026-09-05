<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('the chart of accounts page renders the seeded default accounts', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/chart-of-accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('chart-of-accounts/index')
            ->where('accounts.0.code', '1010'));
});

test('an account with journal lines cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $supplier = Contact::factory()->supplier()->create();
    $product = Product::factory()->create(['current_stock' => 0]);
    $purchase = Purchase::factory()->create(['supplier_id' => $supplier->id]);
    $purchase->items()->create(['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100, 'original_price' => 100, 'subtotal' => 500]);
    $purchase->forceFill(['total_amount' => 500, 'due_amount' => 500])->save();
    $this->post("/purchases/{$purchase->id}/confirm", []);

    $inventory = ChartOfAccount::where('code', '1200')->firstOrFail();

    $this->delete("/chart-of-accounts/{$inventory->id}")->assertSessionHasErrors('chart_of_account');
    expect(ChartOfAccount::find($inventory->id))->not->toBeNull();
});

test('the general ledger page shows a posted line with the running balance', function () {
    $this->actingAs(User::factory()->create());
    $cashType = AccountType::factory()->create(['name' => 'Cash']);
    $cash = Account::factory()->create(['account_type_id' => $cashType->id, 'current_balance' => 0]);
    $bankType = AccountType::factory()->create(['name' => 'Bank']);
    $bank = Account::factory()->create(['account_type_id' => $bankType->id, 'current_balance' => 5000]);

    $this->post('/fund-transfers', [
        'from_account_id' => $bank->id,
        'to_account_id' => $cash->id,
        'amount' => 1000,
        'transfer_date' => '2026-03-01',
    ]);

    $cashCoa = ChartOfAccount::where('code', '1010')->firstOrFail();

    $this->get("/chart-of-accounts/{$cashCoa->id}/ledger")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('chart-of-accounts/ledger')
            ->has('lines', 1)
            ->where('lines.0.debit', 1000)
            ->where('lines.0.balance', 1000));
});

test('the journal entries list and detail pages render', function () {
    $this->actingAs(User::factory()->create());
    $cashType = AccountType::factory()->create(['name' => 'Cash']);
    $cash = Account::factory()->create(['account_type_id' => $cashType->id, 'current_balance' => 5000]);
    $bankType = AccountType::factory()->create(['name' => 'Bank']);
    $bank = Account::factory()->create(['account_type_id' => $bankType->id, 'current_balance' => 0]);

    $this->post('/fund-transfers', [
        'from_account_id' => $cash->id,
        'to_account_id' => $bank->id,
        'amount' => 500,
        'transfer_date' => '2026-03-01',
    ]);

    $entry = JournalEntry::query()->firstOrFail();

    $this->get('/journal-entries')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('journal-entries/index')->has('entries.data', 1));

    $this->get("/journal-entries/{$entry->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('journal-entries/show')->has('entry.lines', 2));
});
