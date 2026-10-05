<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\OtherIncome;
use App\Models\OtherIncomeCategory;
use App\Models\Settings;

beforeEach(function () {
    Settings::factory()->create();
    $this->actingAs(userWithPermissions(['expense.view', 'expense.create', 'expense.edit', 'expense.delete']));
});

function incomeAccount(float $balance = 0): Account
{
    return Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => $balance]);
}

test('recording other income grows the account and credits Other Income with a balanced journal entry', function () {
    $account = incomeAccount(1000);
    $category = OtherIncomeCategory::factory()->create(['name' => 'Scrap / Carton Sale']);

    $this->post(route('other-income.store'), [
        'other_income_category_id' => $category->id,
        'account_id' => $account->id,
        'amount' => 200,
        'income_date' => today()->toDateString(),
        'note' => 'Empty cartons sold',
    ])->assertSessionHasNoErrors();

    $income = OtherIncome::firstOrFail();
    $entry = JournalEntry::where('reference_type', 'other_income')->where('reference_id', $income->id)->firstOrFail();

    expect($account->fresh()->current_balance)->toBe(1200.0)
        ->and($entry->lines->sum('debit'))->toBe($entry->lines->sum('credit'))
        ->and(ChartOfAccount::where('code', '4400')->firstOrFail()->balance)->toBe(200.0);
});

test('deleting other income reverses the account movement and the journal entry', function () {
    $account = incomeAccount(1000);
    $category = OtherIncomeCategory::factory()->create();

    $this->post(route('other-income.store'), [
        'other_income_category_id' => $category->id,
        'account_id' => $account->id,
        'amount' => 200,
        'income_date' => today()->toDateString(),
    ]);

    $income = OtherIncome::firstOrFail();

    $this->delete(route('other-income.destroy', $income))->assertSessionHasNoErrors();

    expect(OtherIncome::count())->toBe(0)
        ->and($account->fresh()->current_balance)->toBe(1000.0)
        ->and(ChartOfAccount::where('code', '4400')->firstOrFail()->balance)->toBe(0.0)
        ->and(JournalEntry::where('reference_type', 'other_income')->where('reference_id', $income->id)->firstOrFail()->status->value)->toBe('reversed');
});

test('category, account, a positive amount and a date are required', function () {
    $this->post(route('other-income.store'), ['amount' => 0])
        ->assertSessionHasErrors(['other_income_category_id', 'account_id', 'amount', 'income_date']);
});

test('a category can be added, renamed and deleted — but not while it has income', function () {
    $this->post(route('other-income-categories.store'), ['name' => 'Interest'])->assertSessionHasNoErrors();
    $category = OtherIncomeCategory::where('name', 'Interest')->firstOrFail();

    $this->patch(route('other-income-categories.update', $category), ['name' => 'Bank Interest'])->assertSessionHasNoErrors();
    expect($category->fresh()->name)->toBe('Bank Interest');

    OtherIncome::factory()->create(['other_income_category_id' => $category->id, 'account_id' => incomeAccount()->id]);
    $this->delete(route('other-income-categories.destroy', $category))->assertSessionHasErrors('category');
    expect(OtherIncomeCategory::find($category->id))->not->toBeNull();

    OtherIncome::query()->delete();
    $this->delete(route('other-income-categories.destroy', $category))->assertSessionHasNoErrors();
    expect(OtherIncomeCategory::find($category->id))->toBeNull();
});

test('category names must be unique', function () {
    OtherIncomeCategory::factory()->create(['name' => 'Tips']);

    $this->post(route('other-income-categories.store'), ['name' => 'Tips'])->assertSessionHasErrors('name');
});

test('the other income page lists entries, the total and categories with their counts', function () {
    $category = OtherIncomeCategory::factory()->create();
    OtherIncome::factory()->create(['other_income_category_id' => $category->id, 'account_id' => incomeAccount()->id, 'amount' => 300]);

    $this->get(route('other-income.index'))->assertInertia(fn ($page) => $page->component('other-income/index')
        ->has('incomes.data', 1)
        ->where('totalIncome', 300)
        ->where('categories.0.incomes_count', 1)
        ->where('categories.0.can_delete', false));
});

test('a user without expense permission cannot reach other income', function () {
    $this->actingAs(userWithPermissions([]));

    $this->get(route('other-income.index'))->assertForbidden();
});
