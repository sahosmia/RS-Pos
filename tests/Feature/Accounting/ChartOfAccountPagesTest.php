<?php

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Settings;
use App\Models\User;
use App\Services\JournalService;

beforeEach(function () {
    Settings::factory()->create();
});

test('the chart of accounts page renders the seeded default accounts', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/chart-of-accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('accounting/chart-of-accounts/index')
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

test('an account with a non-zero balance cannot be deactivated', function () {
    $this->actingAs(User::factory()->create());
    $coa = ChartOfAccount::where('code', '1200')->firstOrFail();
    $coa->forceFill(['balance' => 500.0])->save();

    $this->patch("/chart-of-accounts/{$coa->id}", [
        'code' => $coa->code,
        'name' => $coa->name,
        'type' => $coa->type->value,
        'normal_balance' => $coa->normal_balance->value,
        'parent_id' => $coa->parent_id,
        'is_active' => false,
    ])->assertSessionHasErrors('is_active');

    expect($coa->fresh()->is_active)->toBeTrue();
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

    $cashCoa = $cash->chartOfAccount;

    $this->get("/chart-of-accounts/{$cashCoa->id}/ledger")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('accounting/chart-of-accounts/ledger')
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
        ->assertInertia(fn ($page) => $page->component('accounting/journal-entries/index')->has('entries.data', 1));

    $this->get("/journal-entries/{$entry->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('accounting/journal-entries/show')
            ->where('entry.status', 'posted')
            ->has('entry.lines', 2));
});

test('reversing a journal entry from the UI posts a mirrored entry and marks the original reversed', function () {
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

    $original = JournalEntry::query()->firstOrFail();

    $this->post("/journal-entries/{$original->id}/reverse", ['reason' => 'entered by mistake'])
        ->assertRedirect();

    expect($original->fresh()->status->value)->toBe('reversed')
        ->and(JournalEntry::query()->count())->toBe(2);

    $reversal = JournalEntry::query()->where('reversal_of_id', $original->id)->firstOrFail();

    $this->get("/journal-entries/{$reversal->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('accounting/journal-entries/show')
            ->where('entry.reversal_of.id', $original->id));

    $this->post("/journal-entries/{$original->id}/reverse", ['reason' => 'again'])
        ->assertRedirect()
        ->assertSessionHasErrors(['error']);
});

test('the accounting periods page renders and closing a period locks it', function () {
    $this->actingAs(User::factory()->create());
    $period = AccountingPeriod::factory()->create([
        'start_date' => '2026-03-01',
        'end_date' => '2026-03-31',
        'status' => 'open',
    ]);

    $this->get('/accounting-periods')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('accounting/accounting-periods/index')
            ->where('periods.0.status', 'open'));

    $this->patch("/accounting-periods/{$period->id}/close");

    expect($period->fresh()->status->value)->toBe('closed')
        ->and($period->fresh()->closed_at)->not->toBeNull();
});

test('closing an already-closed period is a no-op', function () {
    $this->actingAs(User::factory()->create());
    $period = AccountingPeriod::factory()->create([
        'start_date' => '2026-03-01',
        'end_date' => '2026-03-31',
        'status' => 'closed',
        'closed_at' => now()->subDay(),
    ]);
    $originalClosedAt = $period->closed_at;

    $this->patch("/accounting-periods/{$period->id}/close");

    expect($period->fresh()->closed_at->toDateTimeString())->toBe($originalClosedAt->toDateTimeString());
});

test('a long general ledger is paged and each page continues the running balance from the one before', function () {
    $this->actingAs(User::factory()->create());
    $cash = ChartOfAccount::where('code', '1010')->firstOrFail();
    $equity = ChartOfAccount::where('code', '3300')->firstOrFail();
    $journal = app(JournalService::class);

    // 130 lines of 10 each: page 1 holds 100, page 2 the last 30
    foreach (range(1, 130) as $n) {
        $journal->post(today()->subDays(200 - $n), "Entry {$n}", [
            ['chart_of_account_id' => $cash->id, 'debit' => 10, 'credit' => 0],
            ['chart_of_account_id' => $equity->id, 'debit' => 0, 'credit' => 10],
        ]);
    }

    // opens on the newest (last) page, carrying the 100 lines before it
    $this->get("/chart-of-accounts/{$cash->id}/ledger")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('pagination.current_page', 2)
            ->where('pagination.last_page', 2)
            ->where('pagination.total', 130)
            ->where('openingBalance', 1000)
            ->has('lines', 30)
            ->where('lines.0.balance', 1010)
            ->where('lines.29.balance', 1300));

    $this->get("/chart-of-accounts/{$cash->id}/ledger?page=1")
        ->assertInertia(fn ($page) => $page
            ->where('openingBalance', 0)
            ->has('lines', 100)
            ->where('lines.0.balance', 10)
            ->where('lines.99.balance', 1000));
});

test('a general ledger date range starts from the balance brought forward', function () {
    $this->actingAs(User::factory()->create());
    $cash = ChartOfAccount::where('code', '1010')->firstOrFail();
    $equity = ChartOfAccount::where('code', '3300')->firstOrFail();
    $journal = app(JournalService::class);

    foreach (['2026-01-10' => 500, '2026-02-10' => 70] as $date => $amount) {
        $journal->post(Carbon\Carbon::parse($date), "Entry {$date}", [
            ['chart_of_account_id' => $cash->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $equity->id, 'debit' => 0, 'credit' => $amount],
        ]);
    }

    $this->get("/chart-of-accounts/{$cash->id}/ledger?from=2026-02-01&to=2026-02-28")
        ->assertInertia(fn ($page) => $page
            ->has('lines', 1)
            ->where('lines.0.balance', 570));
});

test('a long account statement is paged with the balance carried across pages', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id]);

    foreach (range(1, 120) as $n) {
        $account->transactions()->create([
            'type' => AccountTransactionType::OpeningBalance,
            'amount' => 5,
            'operation_date' => '2026-03-01',
        ]);
    }

    $this->get("/accounts/{$account->id}/statement?from=2026-03-01&to=2026-03-31")
        ->assertInertia(fn ($page) => $page
            ->where('pagination.total', 120)
            ->where('pagination.current_page', 2)
            ->where('openingBalance', 500)
            ->has('transactions', 20)
            ->where('transactions.19.balance', 600)
            ->where('closingBalance', 600));
});

test('a crowded cash range steps past the Bank parent code instead of colliding', function () {
    $this->actingAs(User::factory()->create());
    $cash = AccountType::factory()->create(['name' => AccountType::CASH]);

    foreach (range(1, 11) as $i) {
        $this->post('/accounts', ['name' => "Cash {$i}", 'account_type_id' => $cash->id, 'opening_balance' => 0])
            ->assertSessionHasNoErrors();
    }

    $codes = ChartOfAccount::query()->whereIn('name', array_map(fn ($i) => "Cash {$i}", range(1, 11)))->pluck('code');

    expect($codes)->toHaveCount(11)
        ->and($codes->unique())->toHaveCount(11)
        ->and($codes->contains('1020'))->toBeFalse()
        ->and(ChartOfAccount::query()->where('code', '1020')->value('name'))->toBe('Bank Accounts');
});
