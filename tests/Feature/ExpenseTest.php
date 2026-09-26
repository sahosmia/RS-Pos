<?php

use App\Actions\Expenses\Expense\AddExpensePaymentAction;
use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Actions\Expenses\Expense\UpdateExpenseAction;
use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

test('creating an expense category auto-creates its own chart of account under 5200', function () {
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Room Rent']);

    $parent = ChartOfAccount::where('code', '5200')->firstOrFail();

    expect($category->chartOfAccount)->not->toBeNull()
        ->and($category->chartOfAccount->parent_id)->toBe($parent->id)
        ->and($category->chartOfAccount->code)->toBe((string) ((int) $parent->code + 1));
});

test('creating an expense with a vendor posts a balanced journal entry and increases what we owe them', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Utility']);
    $vendor = Contact::factory()->supplier()->create(['balance' => 0]);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'contact_id' => $vendor->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    expect($expense->due_amount)->toBe(3000.0)
        ->and($expense->payment_status->value)->toBe('due')
        // We now owe the vendor — negative per the balance sign convention.
        ->and($vendor->fresh()->balance)->toBe(-3000.0);

    $entry = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->firstOrFail();
    $payable = ChartOfAccount::where('code', '2100')->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($category->chartOfAccount->fresh()->balance)->toBe(3000.0)
        ->and($payable->fresh()->balance)->toBe(3000.0);
});

test('creating an expense with no vendor still posts a balanced journal entry but touches no contact ledger', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Transport']);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'total_amount' => 500,
        'expense_date' => '2026-03-05',
    ]);

    $entry = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($expense->contact_id)->toBeNull();
});

test('paying an expense reduces due, moves the account, and settles the vendor back toward zero', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Rent']);
    $vendor = Contact::factory()->supplier()->create(['balance' => 0]);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 1000]);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'contact_id' => $vendor->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    app(AddExpensePaymentAction::class)->execute($expense, [['account_id' => $account->id, 'amount' => 1000]]);

    expect($expense->fresh()->due_amount)->toBe(2000.0)
        ->and($expense->fresh()->payment_status->value)->toBe('partial')
        ->and($account->fresh()->current_balance)->toBe(0.0)
        ->and($vendor->fresh()->balance)->toBe(-2000.0);

    $paymentEntry = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->latest('id')->firstOrFail();
    expect($paymentEntry->lines->sum('debit'))->toBe($paymentEntry->lines->sum('credit'));
});

test('editing an unpaid expense corrects the amount without leaving a stale journal entry or ledger contribution', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Salary']);
    $vendor = Contact::factory()->supplier()->create(['balance' => 0]);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'contact_id' => $vendor->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    expect($expense->canEdit())->toBeTrue();

    $updated = app(UpdateExpenseAction::class)->execute($expense, [
        'expense_category_id' => $category->id,
        'contact_id' => $vendor->id,
        'total_amount' => 5000,
        'expense_date' => '2026-03-06',
    ]);

    expect($updated->total_amount)->toBe(5000.0)
        ->and($updated->due_amount)->toBe(5000.0)
        ->and($vendor->fresh()->balance)->toBe(-5000.0);

    $postedEntries = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->where('status', 'posted')->get();
    expect($postedEntries)->toHaveCount(1)
        ->and($postedEntries->first()->lines->sum('debit'))->toBe(5000.0);
});

test('an expense with a payment can no longer be edited', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Internet']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 1000]);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'total_amount' => 1000,
        'expense_date' => '2026-03-05',
    ]);

    app(AddExpensePaymentAction::class)->execute($expense, [['account_id' => $account->id, 'amount' => 1000]]);

    expect($expense->fresh()->canEdit())->toBeFalse();

    $this->put(route('expenses.update', $expense->id), [
        'expense_category_id' => $category->id,
        'total_amount' => 2000,
        'expense_date' => '2026-03-05',
    ])->assertSessionHasErrors('expense');
});

test('expense pages render', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Misc']);

    app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'total_amount' => 750,
        'expense_date' => '2026-03-05',
    ]);

    $this->get('/expenses')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('expenses/index')->has('expenses.data', 1));
});
