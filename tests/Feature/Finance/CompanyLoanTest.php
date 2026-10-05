<?php

use App\Actions\CompanyLoan\AddLoanTransactionAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\CompanyLoan;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('disbursement increases outstanding_balance and the receiving account, and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $loan = CompanyLoan::create(['lender_name' => 'ABC Bank', 'loan_amount' => 100000, 'start_date' => today()]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    app(AddLoanTransactionAction::class)->execute($loan, ['type' => 'disbursement', 'amount' => 100000, 'account_id' => $account->id]);

    $payable = ChartOfAccount::where('code', '2200')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'company_loan')->where('reference_id', $loan->id)->firstOrFail();

    expect($loan->fresh()->outstanding_balance)->toBe(100000.0)
        ->and($account->fresh()->current_balance)->toBe(100000.0)
        ->and($payable->fresh()->balance)->toBe(100000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('interest charge grows outstanding_balance with no account movement', function () {
    $this->actingAs(User::factory()->create());
    $loan = CompanyLoan::create(['lender_name' => 'ABC Bank', 'loan_amount' => 100000, 'start_date' => today()]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);
    app(AddLoanTransactionAction::class)->execute($loan, ['type' => 'disbursement', 'amount' => 50000, 'account_id' => $account->id]);

    app(AddLoanTransactionAction::class)->execute($loan->fresh(), ['type' => 'interest_charge', 'amount' => 2000]);

    $interestExpense = ChartOfAccount::where('code', '5900')->firstOrFail();

    expect($loan->fresh()->outstanding_balance)->toBe(52000.0)
        ->and($interestExpense->fresh()->balance)->toBe(2000.0);
});

test('repayment decreases outstanding_balance and the paying account', function () {
    $this->actingAs(User::factory()->create());
    $loan = CompanyLoan::create(['lender_name' => 'ABC Bank', 'loan_amount' => 100000, 'start_date' => today()]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 50000]);
    app(AddLoanTransactionAction::class)->execute($loan, ['type' => 'disbursement', 'amount' => 100000, 'account_id' => $account->id]);

    app(AddLoanTransactionAction::class)->execute($loan->fresh(), ['type' => 'repayment', 'amount' => 20000, 'account_id' => $account->id]);

    expect($loan->fresh()->outstanding_balance)->toBe(80000.0)
        ->and($account->fresh()->current_balance)->toBe(130000.0);
});

test('recalculateLedgerBalance re-derives outstanding_balance from the transaction log', function () {
    $this->actingAs(User::factory()->create());
    $loan = CompanyLoan::create(['lender_name' => 'ABC Bank', 'loan_amount' => 100000, 'start_date' => today()]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 0]);

    app(AddLoanTransactionAction::class)->execute($loan, ['type' => 'disbursement', 'amount' => 100000, 'account_id' => $account->id]);
    app(AddLoanTransactionAction::class)->execute($loan->fresh(), ['type' => 'interest_charge', 'amount' => 3000]);

    $loan->fresh()->forceFill(['outstanding_balance' => 0])->save();
    $loan = $loan->fresh();
    $loan->recalculateLedgerBalance();

    expect($loan->fresh()->outstanding_balance)->toBe(103000.0);
});

test('an existing loan brings in only what is still owed as an opening balance — no account moves', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => 5000]);

    $this->post(route('company-loans.store'), [
        'loan_type' => 'existing',
        'lender_name' => 'Old Lender',
        'loan_amount' => 50000,
        'current_balance' => 40000,
        'start_date' => today()->toDateString(),
    ])->assertSessionHasNoErrors();

    $loan = CompanyLoan::where('lender_name', 'Old Lender')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'company_loan_opening')->where('reference_id', $loan->id)->firstOrFail();

    expect($loan->outstanding_balance)->toBe(40000.0)
        ->and($loan->loan_amount)->toBe(50000.0)
        ->and($account->fresh()->current_balance)->toBe(5000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('a new loan is received into an account in one step', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => 0]);

    $this->post(route('company-loans.store'), [
        'loan_type' => 'new',
        'lender_name' => 'New Lender',
        'loan_amount' => 10000,
        'current_balance' => 0,
        'account_id' => $account->id,
        'start_date' => today()->toDateString(),
    ])->assertSessionHasNoErrors();

    $loan = CompanyLoan::where('lender_name', 'New Lender')->firstOrFail();

    expect($loan->outstanding_balance)->toBe(10000.0)
        ->and($loan->transactions()->count())->toBe(1)
        ->and($account->fresh()->current_balance)->toBe(10000.0);
});

test('an existing loan cannot have a current balance above the original amount', function () {
    $this->actingAs(User::factory()->create());

    $this->post(route('company-loans.store'), [
        'loan_type' => 'existing',
        'lender_name' => 'X',
        'loan_amount' => 1000,
        'current_balance' => 5000,
        'start_date' => today()->toDateString(),
    ])->assertSessionHasErrors('current_balance');
});
