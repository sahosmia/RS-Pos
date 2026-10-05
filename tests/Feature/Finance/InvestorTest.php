<?php

use App\Actions\Investor\AddInvestorTransactionAction;
use App\Actions\Investor\CreateInvestorAction;
use App\Actions\Investor\UpdateInvestorAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Investor;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('investment grows total_invested and the receiving account', function () {
    $this->actingAs(User::factory()->create());
    $investor = Investor::create(['name' => 'Karim Uddin']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    app(AddInvestorTransactionAction::class)->execute($investor, ['type' => 'investment', 'amount' => 500000, 'account_id' => $account->id]);

    $capital = ChartOfAccount::where('code', '3100')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'investor')->where('reference_id', $investor->id)->firstOrFail();

    expect($investor->fresh()->total_invested)->toBe(500000.0)
        ->and($account->fresh()->current_balance)->toBe(500000.0)
        ->and($capital->fresh()->balance)->toBe(500000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('profit share pays cash out against Retained Earnings without touching total_invested', function () {
    $this->actingAs(User::factory()->create());
    $investor = Investor::create(['name' => 'Karim Uddin']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);
    app(AddInvestorTransactionAction::class)->execute($investor, ['type' => 'investment', 'amount' => 500000, 'account_id' => $account->id]);

    app(AddInvestorTransactionAction::class)->execute($investor->fresh(), ['type' => 'profit_share', 'amount' => 10000, 'account_id' => $account->id]);

    $retainedEarnings = ChartOfAccount::where('code', '3200')->firstOrFail();

    // Retained Earnings is credit-normal — paying profit out debits it, so its
    // cached balance moves negative (it started at 0 here).
    expect($investor->fresh()->total_invested)->toBe(500000.0)
        ->and($account->fresh()->current_balance)->toBe(590000.0)
        ->and($retainedEarnings->fresh()->balance)->toBe(-10000.0);
});

test('withdrawal shrinks total_invested and the paying account', function () {
    $this->actingAs(User::factory()->create());
    $investor = Investor::create(['name' => 'Karim Uddin']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);
    app(AddInvestorTransactionAction::class)->execute($investor, ['type' => 'investment', 'amount' => 500000, 'account_id' => $account->id]);

    app(AddInvestorTransactionAction::class)->execute($investor->fresh(), ['type' => 'withdrawal', 'amount' => 50000, 'account_id' => $account->id]);

    expect($investor->fresh()->total_invested)->toBe(450000.0)
        ->and($account->fresh()->current_balance)->toBe(550000.0);
});

test('recalculateLedgerBalance re-derives total_invested from the transaction log', function () {
    $this->actingAs(User::factory()->create());
    $investor = Investor::create(['name' => 'Karim Uddin']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    app(AddInvestorTransactionAction::class)->execute($investor, ['type' => 'investment', 'amount' => 500000, 'account_id' => $account->id]);
    app(AddInvestorTransactionAction::class)->execute($investor->fresh(), ['type' => 'withdrawal', 'amount' => 100000, 'account_id' => $account->id]);

    $investor->fresh()->forceFill(['total_invested' => 0])->save();
    $investor = $investor->fresh();
    $investor->recalculateLedgerBalance();

    expect($investor->fresh()->total_invested)->toBe(400000.0);
});

test('creating an investor with an opening balance sets total_invested and posts a balanced journal entry to Capital', function () {
    $this->actingAs(User::factory()->create());

    $investor = app(CreateInvestorAction::class)->execute(['name' => 'Karim Uddin', 'opening_amount' => 200000]);

    $capital = ChartOfAccount::where('code', '3100')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'investor_opening_amount')->where('reference_id', $investor->id)->firstOrFail();

    expect($investor->total_invested)->toBe(200000.0)
        ->and($investor->opening_amount)->toBe(200000.0)
        ->and($capital->fresh()->balance)->toBe(200000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('an investor without an opening balance posts nothing', function () {
    $this->actingAs(User::factory()->create());

    $investor = app(CreateInvestorAction::class)->execute(['name' => 'Karim Uddin']);

    expect($investor->total_invested)->toBe(0.0)
        ->and(JournalEntry::where('reference_type', 'investor_opening_amount')->count())->toBe(0);
});

test('the opening balance can be corrected before any other transaction, and is locked afterward', function () {
    $this->actingAs(User::factory()->create());
    $investor = app(CreateInvestorAction::class)->execute(['name' => 'Karim Uddin', 'opening_amount' => 200000]);

    expect($investor->canEditOpeningAmount())->toBeTrue();

    app(UpdateInvestorAction::class)->execute($investor, ['name' => 'Karim Uddin', 'opening_amount' => 150000]);
    $capital = ChartOfAccount::where('code', '3100')->firstOrFail();

    expect($investor->fresh()->total_invested)->toBe(150000.0)
        ->and($capital->fresh()->balance)->toBe(150000.0);

    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);
    app(AddInvestorTransactionAction::class)->execute($investor->fresh(), ['type' => 'investment', 'amount' => 1000, 'account_id' => $account->id]);

    expect($investor->fresh()->canEditOpeningAmount())->toBeFalse();

    $this->patch("/investors/{$investor->id}", ['name' => 'Karim Uddin', 'opening_amount' => 1])
        ->assertSessionHasErrors('opening_amount');
});

test('the investors page and store route carry the opening balance', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/investors', ['name' => 'Rahim', 'opening_amount' => 50000])->assertRedirect('/investors');

    $this->get('/investors')->assertInertia(fn ($page) => $page
        ->where('investors.data.0.opening_amount', 50000)
        ->where('investors.data.0.can_edit_opening_amount', true)
        ->where('investors.data.0.total_invested', 50000));
});
