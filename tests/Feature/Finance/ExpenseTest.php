<?php

use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

function expenseAccount(float $balance): Account
{
    return Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => $balance]);
}

test('creating an expense category auto-creates its own chart of account under 5200', function () {
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Room Rent']);

    $parent = ChartOfAccount::where('code', '5200')->firstOrFail();

    expect($category->chartOfAccount)->not->toBeNull()
        ->and($category->chartOfAccount->parent_id)->toBe($parent->id)
        ->and($category->chartOfAccount->code)->toBe((string) ((int) $parent->code + 1));
});

test('an expense is paid in full on the spot: the account is debited and one balanced journal entry is posted', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Utility']);
    $account = expenseAccount(5000);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    expect($expense->total_amount)->toBe(3000.0)
        ->and($account->fresh()->current_balance)->toBe(2000.0);

    $entries = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->get();

    expect($entries)->toHaveCount(1)
        ->and($entries->first()->lines->sum('debit'))->toBe($entries->first()->lines->sum('credit'))
        ->and($category->chartOfAccount->fresh()->balance)->toBe(3000.0)
        // No payable is ever involved — there is no due.
        ->and(ChartOfAccount::where('code', '2100')->first()?->balance ?? 0.0)->toBe(0.0);
});

test('an expense cannot be paid from an account without enough balance', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Utility']);
    $account = expenseAccount(100);

    $this->post('/expenses', [
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 500,
        'expense_date' => '2026-03-05',
    ])->assertSessionHasErrors();

    expect(Expense::count())->toBe(0)->and($account->fresh()->current_balance)->toBe(100.0);
});

test('editing an expense returns the old money to its account and charges the new one', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Transport']);
    $first = expenseAccount(1000);
    $second = expenseAccount(1000);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'account_id' => $first->id,
        'total_amount' => 400,
        'expense_date' => '2026-03-05',
    ]);

    $this->patch("/expenses/{$expense->id}", [
        'expense_category_id' => $category->id,
        'account_id' => $second->id,
        'total_amount' => 250,
        'expense_date' => '2026-03-05',
        'note' => 'Fuel',
    ])->assertSessionHasNoErrors();

    expect($first->fresh()->current_balance)->toBe(1000.0)
        ->and($second->fresh()->current_balance)->toBe(750.0)
        ->and($expense->fresh()->total_amount)->toBe(250.0)
        ->and($expense->fresh()->note)->toBe('Fuel')
        ->and($category->chartOfAccount->fresh()->balance)->toBe(250.0);
});

test('deleting an expense gives the money back and reverses its journal entry', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Tips']);
    $account = expenseAccount(1000);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 300,
        'expense_date' => '2026-03-05',
    ]);

    $this->delete("/expenses/{$expense->id}")->assertSessionHasNoErrors();

    expect(Expense::count())->toBe(0)
        ->and($account->fresh()->current_balance)->toBe(1000.0)
        ->and($category->chartOfAccount->fresh()->balance)->toBe(0.0)
        ->and(JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->firstOrFail()->status->value)->toBe('reversed');
});

test('the expenses list shows the note and the account, with no vendor or due', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Misc']);
    $account = expenseAccount(5000);

    $this->post('/expenses', [
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 750,
        'expense_date' => '2026-03-05',
        'note' => 'Rickshaw to the bank',
    ])->assertSessionDoesntHaveErrors();

    $this->get('/expenses')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('expenses/index')
            ->has('expenses.data', 1)
            ->where('expenses.data.0.note', 'Rickshaw to the bank')
            ->where('expenses.data.0.account.name', $account->name)
            ->missing('expenses.data.0.contact')
            ->missing('expenses.data.0.due_amount')
            ->where('stats.total_expenses', 1)
            ->where('stats.total_amount', 750)
            ->missing('stats.total_due'));
});

test('a deleted expense is hidden but kept on record, so the audit trail survives', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Tips']);
    $account = expenseAccount(1000);
    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id, 'account_id' => $account->id, 'total_amount' => 300, 'expense_date' => '2026-03-05',
    ]);

    $this->delete("/expenses/{$expense->id}")->assertSessionHasNoErrors();

    expect(Expense::count())->toBe(0)
        ->and(Expense::withTrashed()->count())->toBe(1)
        ->and(Expense::withTrashed()->first()->deleted_at)->not->toBeNull()
        // A category that has any expense on record, even a removed one, cannot be deleted.
        ->and($category->expenses()->withTrashed()->exists())->toBeTrue();

    $this->delete(route('expense-categories.destroy', $category))->assertSessionHasErrors('expense_category');
});
