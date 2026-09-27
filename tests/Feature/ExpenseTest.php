<?php

use App\Actions\Expenses\Expense\AddExpensePaymentAction;
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

    // Create is a pure accrual (Dr category/Cr Payable) — paying it down (Dr
    // Payable/Cr account) is always a separate step, same split Purchase's
    // confirm/pay-due already uses. The Expense form posts a single account
    // paid in full and the controller chains these two calls itself; this
    // test exercises the same two-action sequence directly.
    $expense = app(CreateExpenseAction::class)->execute([
        'expense_category_id' => $category->id,
        'total_amount' => 3000,
        'expense_date' => '2026-03-05',
    ]);

    app(AddExpensePaymentAction::class)->execute($expense, [['account_id' => $account->id, 'amount' => 3000]]);
    $expense->refresh();

    expect($expense->total_amount)->toBe(3000.0)
        ->and($expense->paid_amount)->toBe(3000.0)
        ->and($expense->due_amount)->toBe(0.0)
        ->and($expense->payment_status->value)->toBe('paid')
        ->and($account->fresh()->current_balance)->toBe(2000.0);

    $entries = JournalEntry::where('reference_type', 'expense')->where('reference_id', $expense->id)->get();

    expect($entries)->toHaveCount(2) // the accrual entry, then the payment entry
        ->and($entries->every(fn (JournalEntry $entry) => $entry->lines->sum('debit') === $entry->lines->sum('credit')))->toBeTrue()
        ->and($category->chartOfAccount->fresh()->balance)->toBe(3000.0);
});

test('expense pages render', function () {
    $this->actingAs(User::factory()->create());
    $category = app(CreateExpenseCategoryAction::class)->execute(['name' => 'Misc']);
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 5000]);

    // Through the real endpoint (not the Action directly) — the form still
    // posts a single account_id, which the controller settles as a separate
    // full payment right after creating the accrual.
    $this->post('/expenses', [
        'expense_category_id' => $category->id,
        'account_id' => $account->id,
        'total_amount' => 750,
        'expense_date' => '2026-03-05',
    ])->assertSessionDoesntHaveErrors();

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
