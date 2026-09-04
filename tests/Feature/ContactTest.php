<?php

use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\CustomerGroup;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/contacts')->assertRedirect('/login');
});

test('contacts page filters by type', function () {
    $this->actingAs(User::factory()->create());
    Contact::factory()->create(['name' => 'Alice Customer', 'type' => 'customer']);
    Contact::factory()->supplier()->create(['name' => 'Bob Supplier']);

    $this->get('/contacts?type=supplier')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('contacts/index')
            ->has('contacts.data', 1)
            ->where('contacts.data.0.name', 'Bob Supplier'));
});

test('creating a contact with an opening balance records the opening ledger entry', function () {
    $this->actingAs(User::factory()->create());
    $group = CustomerGroup::factory()->create();

    $this->post('/contacts', [
        'name' => 'City Traders',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'business',
        'business_name' => 'City Traders Ltd',
        'customer_group_id' => $group->id,
        'is_active' => true,
        'opening_balance' => 5000,
    ])->assertRedirect('/contacts');

    $contact = Contact::query()->firstOrFail();

    expect($contact->balance)->toBe(5000.0)
        ->and($contact->ledgerEntries()->where('type', ContactLedgerType::OpeningBalance)->count())->toBe(1);
});

test('business_name is required when entity_type is business', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/contacts', [
        'name' => 'No Business Name',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'business',
        'is_active' => true,
    ])->assertSessionHasErrors('business_name');
});

test('opening balance is rejected once the contact already has a ledger entry', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create();
    ContactLedger::factory()->create(['contact_id' => $contact->id, 'type' => ContactLedgerType::OpeningBalance, 'amount' => 500]);

    $this->patch("/contacts/{$contact->id}", [
        'name' => $contact->name,
        'phone' => $contact->phone,
        'type' => $contact->type->value,
        'entity_type' => $contact->entity_type->value,
        'is_active' => true,
        'opening_balance' => 1000,
    ])->assertSessionHasErrors('opening_balance');

    expect($contact->ledgerEntries()->count())->toBe(1);
});

test('a contact with ledger history cannot be deleted', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create();
    ContactLedger::factory()->create(['contact_id' => $contact->id]);

    $this->delete("/contacts/{$contact->id}")->assertSessionHasErrors('contact');

    expect(Contact::query()->find($contact->id))->not->toBeNull();
});

test('bulk delete removes only contacts without ledger history', function () {
    $this->actingAs(User::factory()->create());
    $clean = Contact::factory()->create();
    $withHistory = Contact::factory()->create();
    ContactLedger::factory()->create(['contact_id' => $withHistory->id]);

    $this->post('/contacts/bulk-delete', ['ids' => [$clean->id, $withHistory->id]])
        ->assertSessionHasErrors('contacts');

    expect(Contact::query()->find($clean->id))->toBeNull()
        ->and(Contact::query()->find($withHistory->id))->not->toBeNull();
});

test('receiving a payment decreases receivable and records both sides', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['balance' => 1000]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    $this->post("/contacts/{$contact->id}/payments", [
        'account_id' => $account->id,
        'amount' => 400,
        'direction' => 'received',
    ])->assertRedirect();

    expect($contact->fresh()->balance)->toBe(600.0)
        ->and($account->fresh()->current_balance)->toBe(400.0);
});

test('making a payment reduces payable and records both sides', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->supplier()->create(['balance' => -1000]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 2000]);

    $this->post("/contacts/{$contact->id}/payments", [
        'account_id' => $account->id,
        'amount' => 400,
        'direction' => 'made',
    ])->assertRedirect();

    expect($contact->fresh()->balance)->toBe(-600.0)
        ->and($account->fresh()->current_balance)->toBe(1600.0);
});

test('contact detail page shows the running ledger balance', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['balance' => 300]);
    ContactLedger::factory()->create(['contact_id' => $contact->id, 'type' => ContactLedgerType::OpeningBalance, 'amount' => 300]);

    $this->get("/contacts/{$contact->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('contacts/show')
            ->where('contact.balance', 300)
            ->has('ledger', 1));
});

test('export streams a csv of the selected contacts', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['name' => 'Export Me']);

    $response = $this->get('/contacts/export?ids[]='.$contact->id);

    $response->assertOk();
    expect($response->streamedContent())->toContain('Export Me');
});
