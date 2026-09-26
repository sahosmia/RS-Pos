<?php

use App\Actions\Staff\AddStaffTransactionAction;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\Staff;
use App\Models\StaffTransactionType;
use App\Models\User;
use Database\Seeders\StaffTransactionTypeSeeder;

beforeEach(function () {
    Settings::factory()->create();
    app(StaffTransactionTypeSeeder::class)->run();
});

test('salary charge decreases balance (company now owes staff more) with no account movement', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $type = StaffTransactionType::where('name', 'Salary Charge')->firstOrFail();

    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $type->id, 'amount' => 15000]);

    $salaryExpense = ChartOfAccount::where('code', '5210')->firstOrFail();
    $staffPayable = ChartOfAccount::where('code', '2250')->firstOrFail();
    $entry = JournalEntry::where('reference_type', 'staff')->where('reference_id', $staff->id)->firstOrFail();

    expect($staff->fresh()->balance)->toBe(-15000.0)
        ->and($salaryExpense->fresh()->balance)->toBe(15000.0)
        ->and($staffPayable->fresh()->balance)->toBe(15000.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'));
});

test('salary payment settles the due, moving cash and increasing balance back toward zero', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 100000]);

    $charge = StaffTransactionType::where('name', 'Salary Charge')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $charge->id, 'amount' => 15000]);

    $payment = StaffTransactionType::where('name', 'Salary Payment')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff->fresh(), [
        'staff_transaction_type_id' => $payment->id,
        'amount' => 15000,
        'account_id' => $account->id,
    ]);

    expect($staff->fresh()->balance)->toBe(0.0)
        ->and($account->fresh()->current_balance)->toBe(85000.0);

    $accountTransaction = AccountTransaction::where('reference_type', 'staff')->where('reference_id', $staff->id)->firstOrFail();
    expect($accountTransaction->type->value)->toBe('staff_salary_payment');
});

test('advance given and loan given both increase balance and post to Staff Advances, tagged with distinct account transaction types', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 50000]);
    $staffAdvances = ChartOfAccount::where('code', '1300')->firstOrFail();

    $advanceType = StaffTransactionType::where('name', 'Advance Given')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $advanceType->id, 'amount' => 5000, 'account_id' => $account->id]);

    $loanType = StaffTransactionType::where('name', 'Loan Given')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff->fresh(), ['staff_transaction_type_id' => $loanType->id, 'amount' => 10000, 'account_id' => $account->id]);

    expect($staff->fresh()->balance)->toBe(15000.0)
        ->and($account->fresh()->current_balance)->toBe(35000.0)
        ->and($staffAdvances->fresh()->balance)->toBe(15000.0);

    $transactions = AccountTransaction::where('reference_type', 'staff')->where('reference_id', $staff->id)->orderBy('id')->get();
    expect($transactions->pluck('type.value')->all())->toBe(['staff_advance', 'staff_loan']);
});

test('an increase adjustment starting from zero routes to Staff Advances (asset side)', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $staffAdvances = ChartOfAccount::where('code', '1300')->firstOrFail();

    $increase = StaffTransactionType::where('name', 'Adjustment (Increase)')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $increase->id, 'amount' => 2000]);

    expect($staff->fresh()->balance)->toBe(2000.0)
        ->and($staffAdvances->fresh()->balance)->toBe(2000.0);
});

test('a decrease adjustment starting from zero routes to Staff Payable (liability side)', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $staffPayable = ChartOfAccount::where('code', '2250')->firstOrFail();

    $decrease = StaffTransactionType::where('name', 'Adjustment (Decrease)')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $decrease->id, 'amount' => 3000]);

    expect($staff->fresh()->balance)->toBe(-3000.0)
        ->and($staffPayable->fresh()->balance)->toBe(3000.0);
});

test('an adjustment that crosses zero keeps posting against whichever side the balance started on', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $staffAdvances = ChartOfAccount::where('code', '1300')->firstOrFail();
    $staffPayable = ChartOfAccount::where('code', '2250')->firstOrFail();

    $increase = StaffTransactionType::where('name', 'Adjustment (Increase)')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $increase->id, 'amount' => 2000]);

    // Balance started this correction on the asset side (2000, in 1300) —
    // even though it ends up negative, the correction stays in 1300 rather
    // than jumping to 2250 mid-transaction.
    $decrease = StaffTransactionType::where('name', 'Adjustment (Decrease)')->firstOrFail();
    app(AddStaffTransactionAction::class)->execute($staff->fresh(), ['staff_transaction_type_id' => $decrease->id, 'amount' => 5000]);

    expect($staff->fresh()->balance)->toBe(-3000.0)
        ->and($staffAdvances->fresh()->balance)->toBe(-3000.0)
        ->and($staffPayable->fresh()->balance)->toBe(0.0);
});

test('staff pages render', function () {
    $this->actingAs(User::factory()->create());
    Staff::factory()->create();

    $this->get('/staff')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('staff/index')->has('staff', 1));
});

test('the staff detail page renders its ledger without crashing on the eager-loaded transaction type', function () {
    $this->actingAs(User::factory()->create());
    $staff = Staff::factory()->create(['balance' => 0]);
    $type = StaffTransactionType::where('name', 'Salary Charge')->firstOrFail();

    app(AddStaffTransactionAction::class)->execute($staff, ['staff_transaction_type_id' => $type->id, 'amount' => 15000]);

    $this->get("/staff/{$staff->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('staff/show')
            ->has('transactions', 1)
            ->where('transactions.0.amount', -15000));
});
