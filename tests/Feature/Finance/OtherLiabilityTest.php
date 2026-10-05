<?php

use App\Actions\OtherLiability\AddOtherLiabilityTransactionAction;
use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use App\Actions\OtherLiability\UpdateOtherLiabilityAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('creating a liability with an opening amount posts a balanced journal entry and increases the liability control account', function () {
    $this->actingAs(User::factory()->create());

    $liability = app(CreateOtherLiabilityAction::class)->execute(['name' => 'Old Tax Due', 'opening_amount' => 8000]);

    $otherLiabilities = ChartOfAccount::where('code', '2300')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'other_liability_opening_amount')->where('reference_id', $liability->id)->firstOrFail();

    expect($liability->current_balance)->toBe(8000.0)
        ->and($otherLiabilities->fresh()->balance)->toBe(8000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('increase grows the balance and receives cash into the chosen account', function () {
    $this->actingAs(User::factory()->create());
    $liability = app(CreateOtherLiabilityAction::class)->execute(['name' => 'Informal Loan']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    app(AddOtherLiabilityTransactionAction::class)->execute($liability, ['type' => 'increase', 'amount' => 5000, 'account_id' => $account->id]);

    expect($liability->fresh()->current_balance)->toBe(5000.0)
        ->and($account->fresh()->current_balance)->toBe(5000.0);
});

test('payment reduces the balance and pays from the chosen account', function () {
    $this->actingAs(User::factory()->create());
    $liability = app(CreateOtherLiabilityAction::class)->execute(['name' => 'Old Tax Due', 'opening_amount' => 8000]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    app(AddOtherLiabilityTransactionAction::class)->execute($liability->fresh(), ['type' => 'payment', 'amount' => 3000, 'account_id' => $account->id]);

    expect($liability->fresh()->current_balance)->toBe(5000.0)
        ->and($account->fresh()->current_balance)->toBe(7000.0);
});

test('the opening amount can be corrected before any other transaction, and is locked afterward', function () {
    $this->actingAs(User::factory()->create());
    $liability = app(CreateOtherLiabilityAction::class)->execute(['name' => 'Old Tax Due', 'opening_amount' => 8000]);

    expect($liability->canEditOpeningAmount())->toBeTrue();

    app(UpdateOtherLiabilityAction::class)->execute($liability, ['name' => 'Old Tax Due', 'opening_amount' => 6000]);
    expect($liability->fresh()->current_balance)->toBe(6000.0);

    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);
    app(AddOtherLiabilityTransactionAction::class)->execute($liability->fresh(), ['type' => 'increase', 'amount' => 1000, 'account_id' => $account->id]);

    expect($liability->fresh()->canEditOpeningAmount())->toBeFalse();
});

test('recalculateLedgerBalance re-derives current_balance from the transaction log', function () {
    $this->actingAs(User::factory()->create());
    $liability = app(CreateOtherLiabilityAction::class)->execute(['name' => 'Old Tax Due', 'opening_amount' => 8000]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10000]);

    app(AddOtherLiabilityTransactionAction::class)->execute($liability->fresh(), ['type' => 'payment', 'amount' => 3000, 'account_id' => $account->id]);

    $liability = $liability->fresh();
    $liability->forceFill(['current_balance' => 0])->save();
    $liability->recalculateLedgerBalance();

    expect($liability->fresh()->current_balance)->toBe(5000.0);
});
