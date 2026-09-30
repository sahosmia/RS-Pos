<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\User;

test('account types can be created', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/account-types', ['name' => 'Card'])
        ->assertRedirect('/accounts?tab=types');

    expect(AccountType::query()->where('name', 'Card')->exists())->toBeTrue();
});

test('account type names must be unique', function () {
    $this->actingAs(User::factory()->create());
    AccountType::factory()->create(['name' => 'Card']);

    $this->post('/account-types', ['name' => 'Card'])->assertSessionHasErrors('name');
});

test('an account type can be renamed', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create(['name' => 'Card']);

    $this->patch("/account-types/{$type->id}", ['name' => 'Debit Card'])
        ->assertRedirect('/accounts?tab=types');

    expect($type->fresh()->name)->toBe('Debit Card');
});

test('the built-in Cash type cannot be renamed or deleted', function () {
    $this->actingAs(User::factory()->create());
    $cash = AccountType::factory()->create(['name' => AccountType::CASH]);

    $this->patch("/account-types/{$cash->id}", ['name' => 'Petty'])->assertSessionHasErrors('name');
    $this->delete("/account-types/{$cash->id}")->assertSessionHasErrors('account_type');

    expect($cash->fresh()->name)->toBe('Cash');
});

test('a type in use by an account cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create(['name' => 'Bank']);
    Account::factory()->create(['account_type_id' => $type->id]);

    $this->delete("/account-types/{$type->id}")->assertSessionHasErrors('account_type');

    expect(AccountType::query()->whereKey($type->id)->exists())->toBeTrue();
});

test('an unused type can be deleted', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create(['name' => 'Card']);

    $this->delete("/account-types/{$type->id}")->assertRedirect('/accounts?tab=types');

    expect(AccountType::query()->whereKey($type->id)->exists())->toBeFalse();
});

test('the accounts page exposes each type with its usage', function () {
    $this->actingAs(User::factory()->create());
    $type = AccountType::factory()->create(['name' => 'Bank']);
    Account::factory()->create(['account_type_id' => $type->id]);

    $this->get('/accounts')->assertInertia(fn ($page) => $page
        ->component('accounting/accounts/index')
        ->where('accountTypes.0.name', 'Bank')
        ->where('accountTypes.0.accounts_count', 1)
        ->where('accountTypes.0.can_delete', false));
});
