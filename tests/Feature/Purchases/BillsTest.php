<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\User;

/*
 * Standalone sidebar entry points for the same settle/waive actions
 * ContactPaymentController/ContactDueWaiverController already post from the
 * Contact Detail page — these just render the picker-first page and confirm
 * a full round trip through them still lands on the contact's ledger.
 */

test('the bill receive page renders with active accounts only', function () {
    $this->actingAs(User::factory()->create());
    Account::factory()->create(['account_type_id' => AccountType::factory(), 'name' => 'Active Cash', 'is_active' => true]);
    Account::factory()->create(['account_type_id' => AccountType::factory(), 'name' => 'Closed Account', 'is_active' => false]);

    $this->get('/bills/receive')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('bills/receive')
            ->has('accounts', 1)
            ->where('accounts.0.name', 'Active Cash'));
});

test('the bill pay page renders with active accounts only', function () {
    $this->actingAs(User::factory()->create());
    Account::factory()->create(['account_type_id' => AccountType::factory(), 'is_active' => true]);

    $this->get('/bills/pay')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('bills/pay')->has('accounts', 1));
});

test('the add discount page renders with no accounts prop', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/bills/discount')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('bills/discount')->missing('accounts'));
});

test('recording a bill receipt from the standalone page settles the customer and hits the account', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['balance' => 1000]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $this->post("/contacts/{$contact->id}/payments", [
        'account_id' => $account->id,
        'amount' => 400,
        'direction' => 'received',
    ])->assertRedirect();

    expect($contact->fresh()->balance)->toBe(600.0)
        ->and($account->fresh()->current_balance)->toBe(400.0)
        ->and($contact->ledgerEntries()->count())->toBe(1);
});

test('applying a discount from the standalone page waives the due with no account movement', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['balance' => 1000]);

    $this->post("/contacts/{$contact->id}/due-waivers", ['amount' => 200])->assertRedirect();

    expect($contact->fresh()->balance)->toBe(800.0);
});
