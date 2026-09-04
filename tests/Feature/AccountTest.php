<?php

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\AccountType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('guests are redirected to the login page', function () {
    $this->get('/accounts')->assertRedirect('/login');
});

test('accounts page lists accounts with their balance', function () {
    $this->actingAs(User::factory()->create());
    Account::factory()->create(['name' => 'Cash Drawer', 'current_balance' => 2500]);

    $this->get('/accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('accounts/index')
            ->where('accounts.0.name', 'Cash Drawer')
            ->where('accounts.0.current_balance', 2500)
            ->where('totalBalance', 2500));
});

test('creating an account with an opening balance records the opening entry', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create();

    $this->post('/accounts', [
        'name' => 'City Bank',
        'account_type_id' => $type->id,
        'account_number' => '1234567890',
        'opening_balance' => 5000,
    ])->assertRedirect('/accounts');

    $account = Account::query()->firstOrFail();

    expect($account->current_balance)->toBe(5000.0)
        ->and($account->account_number)->toBe('1234567890')
        ->and($account->transactions()->where('type', AccountTransactionType::OpeningBalance)->count())->toBe(1);
});

test('account number is stored encrypted', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create();

    $this->post('/accounts', [
        'name' => 'City Bank',
        'account_type_id' => $type->id,
        'account_number' => '1234567890',
        'opening_balance' => 0,
    ]);

    expect(DB::table('accounts')->value('account_number'))->not->toBe('1234567890');
});

test('opening balance can still be corrected while nothing else has happened', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create();
    $account = Account::factory()->create([
        'account_type_id' => $type->id,
        'opening_balance' => 5000,
        'current_balance' => 5000,
    ]);
    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::OpeningBalance,
        'amount' => 5000,
    ]);

    $this->patch("/accounts/{$account->id}", [
        'name' => $account->name,
        'account_type_id' => $type->id,
        'opening_balance' => 7000,
        'is_active' => true,
    ])->assertRedirect('/accounts');

    expect($account->fresh()->current_balance)->toBe(7000.0)
        ->and($account->openingTransaction()->amount)->toBe(7000.0);
});

test('opening balance is locked once another movement exists', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create();
    $account = Account::factory()->create([
        'account_type_id' => $type->id,
        'opening_balance' => 5000,
        'current_balance' => 5500,
    ]);
    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::OpeningBalance,
        'amount' => 5000,
    ]);
    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::SalePayment,
        'amount' => 500,
    ]);

    $this->patch("/accounts/{$account->id}", [
        'name' => $account->name,
        'account_type_id' => $type->id,
        'opening_balance' => 9000,
        'is_active' => true,
    ])->assertSessionHasErrors('opening_balance');

    expect($account->fresh()->current_balance)->toBe(5500.0);
});

test('an account holding transactions cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create();
    AccountTransaction::factory()->create(['account_id' => $account->id]);

    $this->delete("/accounts/{$account->id}")->assertSessionHasErrors('account');

    expect(Account::query()->count())->toBe(1);
});

test('an untouched account can be deleted', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create();

    $this->delete("/accounts/{$account->id}")->assertRedirect('/accounts');

    expect(Account::query()->count())->toBe(0);
});

test('fund transfer moves money between two accounts', function () {
    $this->actingAs(User::factory()->create());
    $from = Account::factory()->create(['current_balance' => 1000]);
    $to = Account::factory()->create(['current_balance' => 0]);

    $this->post('/fund-transfers', [
        'from_account_id' => $from->id,
        'to_account_id' => $to->id,
        'amount' => 250,
        'transfer_date' => '2026-03-01',
    ])->assertRedirect('/accounts');

    expect($from->fresh()->current_balance)->toBe(750.0)
        ->and($to->fresh()->current_balance)->toBe(250.0)
        ->and(AccountTransaction::query()->where('type', AccountTransactionType::TransferOut)->value('amount'))->toBe(-250.0)
        ->and(AccountTransaction::query()->where('type', AccountTransactionType::TransferIn)->value('amount'))->toBe(250.0);
});

test('fund transfer needs two different accounts', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['current_balance' => 1000]);

    $this->post('/fund-transfers', [
        'from_account_id' => $account->id,
        'to_account_id' => $account->id,
        'amount' => 250,
        'transfer_date' => '2026-03-01',
    ])->assertSessionHasErrors('to_account_id');

    expect($account->fresh()->current_balance)->toBe(1000.0);
});

test('statement carries earlier movement in and runs the balance forward', function () {
    $this->actingAs(User::factory()->create());
    $account = Account::factory()->create(['current_balance' => 900]);

    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::OpeningBalance,
        'amount' => 500,
        'operation_date' => '2026-01-10',
    ]);
    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::SalePayment,
        'amount' => 600,
        'operation_date' => '2026-02-05',
    ]);
    AccountTransaction::factory()->create([
        'account_id' => $account->id,
        'type' => AccountTransactionType::PurchasePayment,
        'amount' => -200,
        'operation_date' => '2026-02-20',
    ]);

    $this->get("/accounts/{$account->id}/statement?from=2026-02-01&to=2026-02-28")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('accounts/statement')
            ->where('broughtForward', 500)
            ->where('transactions.0.balance', 1100)
            ->where('transactions.1.balance', 900)
            ->where('closingBalance', 900));
});
