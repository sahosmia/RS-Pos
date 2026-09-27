<?php

use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
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

test('creating an expense deducts money from account and posts a balanced journal entry', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Utility']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 5000]);

    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    expect($expense->total_amount)->toBe(3000.0)
        ->and($expense->paid_amount)->toBe(3000.0)
        ->and($expense->due_amount)->toBe(0.0)
        ->and($expense->payment_status->value)->toBe('paid')
        ->and($account->fresh()->current_balance)->toBe(2000.0);

    $entry = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->firstOrFail();

    expect($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and($category->chartOfAccount->fresh()->balance)->toBe(3000.0);
});

test('expense pages render', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Misc']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 5000]);

    app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 750,
        'expense_date' => '2026-03-05',
    ]);

    $this->get('/expenses')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('expenses/index')
            ->has('expenses.data', 1)
            ->where('stats.total_expenses', 1)
            ->where('stats.total_amount', 750)
            ->where('stats.total_paid', 750)
            ->where('stats.total_due', 0));
});
