<?php

use App\Actions\Accounting\Account\FundTransferAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Expense;
use App\Models\OtherIncome;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\User;

beforeEach(function () {
    Settings::factory()->create();
});

function cashAccount(float $balance = 10000): Account
{
    return Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'current_balance' => $balance]);
}

test('the logged-in user is stamped on a new row automatically', function () {
    $user = User::factory()->create(['name' => 'Rahim']);
    $this->actingAs($user);

    $expense = Expense::factory()->create();

    expect($expense->created_by)->toBe($user->id)
        ->and($expense->creator->name)->toBe('Rahim');
});

test('an explicit created_by is never overwritten, and nobody is stamped when nobody is logged in', function () {
    $someoneElse = User::factory()->create();
    $this->actingAs(User::factory()->create());

    expect(Expense::factory()->create(['created_by' => $someoneElse->id])->created_by)->toBe($someoneElse->id);

    auth()->logout();

    expect(Expense::factory()->create()->created_by)->toBeNull();
});

test('the expenses list shows who added each expense', function () {
    $this->actingAs(User::factory()->create(['name' => 'Karim']));
    Expense::factory()->create(['note' => 'Tea']);

    $this->get('/expenses')->assertInertia(fn ($page) => $page->where('expenses.data.0.added_by', 'Karim'));
});

test('the other income list shows who added each entry', function () {
    $this->actingAs(userWithPermissions(['expense.view']));
    OtherIncome::factory()->create(['created_by' => User::factory()->create(['name' => 'Salma'])->id]);

    $this->get('/other-income')->assertInertia(fn ($page) => $page->where('incomes.data.0.added_by', 'Salma'));
});

test('the sales and purchases lists show who added each one', function () {
    $this->actingAs(User::factory()->create(['name' => 'Nasrin']));
    Sale::factory()->create();
    Purchase::factory()->create();

    $this->get('/sales?preset=all')->assertInertia(fn ($page) => $page->where('sales.data.0.added_by', 'Nasrin'));
    $this->get('/purchases')->assertInertia(fn ($page) => $page->where('purchases.data.0.added_by', 'Nasrin'));
});

test('a fund transfer shows who made it on both accounts statements', function () {
    $this->actingAs(User::factory()->create(['name' => 'Jamal']));
    $from = cashAccount();
    $to = cashAccount(0);

    app(FundTransferAction::class)->execute($from, $to, 500, today());

    foreach ([$from, $to] as $account) {
        // `to` is tomorrow: the statement compares a datetime column with a plain date, which drops the last day on SQLite.
        $this->get("/accounts/{$account->id}/statement?to=".today()->addDay()->toDateString())->assertInertia(fn ($page) => $page->where('transactions.0.added_by', 'Jamal'));
    }
});
