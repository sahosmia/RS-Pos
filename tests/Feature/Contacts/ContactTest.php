<?php

use App\Enums\CampaignStatus;
use App\Enums\CampaignTargetType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\CustomerGroup;
use App\Models\MessageLog;
use App\Models\Purchase;
use App\Models\Sale;
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
        'first_name' => 'City',
        'last_name' => 'Traders',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'business',
        'business_name' => 'City Traders Ltd',
        'customer_group_id' => $group->id,
        'is_active' => true,
        'opening_balance' => 5000,
    ])->assertRedirect('/contacts?type=customer');

    $contact = Contact::query()->firstOrFail();

    expect($contact->balance)->toBe(5000.0)
        ->and($contact->ledgerEntries()->where('type', ContactLedgerType::OpeningBalance)->count())->toBe(1);
});

test('first_name and last_name are required when creating a contact', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/contacts', [
        'name' => 'No First Last',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertSessionHasErrors(['first_name', 'last_name']);
});

test('a contact created without a contact id gets one auto-generated from its own id', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/contacts', [
        'name' => 'Auto Coded',
        'first_name' => 'Auto',
        'last_name' => 'Coded',
        'phone' => '+8801712345678',
        'type' => 'supplier',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertRedirect('/contacts?type=supplier');

    $contact = Contact::query()->where('name', 'Auto Coded')->firstOrFail();

    expect($contact->contact_code)->toBe(sprintf('SUP-%06d', $contact->id));
});

test('a contact created with an explicit contact id keeps it instead of auto-generating one', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/contacts', [
        'name' => 'Manually Coded',
        'first_name' => 'Manually',
        'last_name' => 'Coded',
        'contact_code' => 'CUS-CUSTOM-1',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertRedirect('/contacts?type=customer');

    expect(Contact::query()->where('name', 'Manually Coded')->value('contact_code'))->toBe('CUS-CUSTOM-1');
});

test('contact id must be unique on create', function () {
    $this->actingAs(User::factory()->create());
    Contact::factory()->create(['contact_code' => 'CUS-000099']);

    $this->post('/contacts', [
        'name' => 'Duplicate Code',
        'contact_code' => 'CUS-000099',
        'phone' => '+8801712345678',
        'type' => 'customer',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertSessionHasErrors('contact_code');
});

test('the new profile fields round-trip through create and the show page', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/contacts', [
        'name' => 'Dr. John Michael Doe',
        'prefix' => 'dr',
        'first_name' => 'John',
        'middle_name' => 'Michael',
        'last_name' => 'Doe',
        'phone' => '+8801712345678',
        'phone_alternate' => '+8801812345678',
        'reference' => 'Referred by Alice',
        'type' => 'customer',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertRedirect('/contacts?type=customer');

    $contact = Contact::query()->where('first_name', 'John')->firstOrFail();

    $this->get("/contacts/{$contact->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('contacts/show')
            ->where('contact.prefix', 'dr')
            ->where('contact.first_name', 'John')
            ->where('contact.middle_name', 'Michael')
            ->where('contact.last_name', 'Doe')
            ->where('contact.phone_alternate', '+8801812345678')
            ->where('contact.reference', 'Referred by Alice'));
});

test('leaving contact id blank on update keeps the existing one instead of wiping it', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['contact_code' => 'CUS-000042']);

    $this->patch("/contacts/{$contact->id}", [
        'name' => $contact->name,
        'phone' => $contact->phone,
        'type' => $contact->type->value,
        'entity_type' => $contact->entity_type->value,
        'is_active' => true,
    ])->assertRedirect();

    expect($contact->fresh()->contact_code)->toBe('CUS-000042');
});

test('contact id must be unique on update, ignoring the contact being updated', function () {
    $this->actingAs(User::factory()->create());
    Contact::factory()->create(['contact_code' => 'CUS-000001']);
    $contact = Contact::factory()->create(['contact_code' => 'CUS-000002']);

    $this->patch("/contacts/{$contact->id}", [
        'name' => $contact->name,
        'phone' => $contact->phone,
        'contact_code' => 'CUS-000001',
        'type' => $contact->type->value,
        'entity_type' => $contact->entity_type->value,
        'is_active' => true,
    ])->assertSessionHasErrors('contact_code');

    // Keeping its own code on an update must never trip the uniqueness rule against itself.
    $this->patch("/contacts/{$contact->id}", [
        'name' => $contact->name,
        'phone' => $contact->phone,
        'contact_code' => 'CUS-000002',
        'type' => $contact->type->value,
        'entity_type' => $contact->entity_type->value,
        'is_active' => true,
    ])->assertSessionDoesntHaveErrors('contact_code');
});

test('contact type cannot be changed when sales or purchases history exists', function () {
    $this->actingAs(User::factory()->create());
    $customer = Contact::factory()->create(['type' => 'customer']);
    Sale::factory()->create(['customer_id' => $customer->id]);

    $this->patch("/contacts/{$customer->id}", [
        'name' => $customer->name,
        'phone' => $customer->phone,
        'type' => 'supplier',
        'entity_type' => $customer->entity_type->value,
        'is_active' => true,
    ])->assertSessionHasErrors('type');

    $supplier = Contact::factory()->supplier()->create(['type' => 'supplier']);
    Purchase::factory()->create(['supplier_id' => $supplier->id]);

    $this->patch("/contacts/{$supplier->id}", [
        'name' => $supplier->name,
        'phone' => $supplier->phone,
        'type' => 'customer',
        'entity_type' => $supplier->entity_type->value,
        'is_active' => true,
    ])->assertSessionHasErrors('type');
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

test('export downloads a csv of the selected contacts', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['name' => 'Export Me']);

    $response = $this->get('/contacts/export?'.http_build_query([
        'format' => 'csv',
        'scope' => 'selected',
        'ids' => [$contact->id],
        'columns' => ['name'],
    ], '', '&', PHP_QUERY_RFC3986));

    $response->assertOk()->assertDownload('contacts.csv');
});

test('bulk sending a notification creates a campaign, recipients, and message logs', function () {
    $user = User::factory()->create();
    $one = Contact::factory()->create();
    $two = Contact::factory()->create();

    $this->actingAs($user)
        ->post('/contacts/send-notification', [
            'ids' => [$one->id, $two->id],
            'channel' => 'sms',
            'message' => 'Your order is ready for pickup.',
        ])
        ->assertRedirect();

    expect(Campaign::count())->toBe(1)
        ->and(CampaignRecipient::count())->toBe(2)
        ->and(MessageLog::count())->toBe(2);

    $campaign = Campaign::first();
    expect($campaign->status)->toBe(CampaignStatus::Completed)
        ->and($campaign->target_type)->toBe(CampaignTargetType::CustomSelection)
        ->and($campaign->created_by)->toBe($user->id);
});

test('email channel requires a subject', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create(['email' => 'test@example.com']);

    $this->post('/contacts/send-notification', [
        'ids' => [$contact->id],
        'channel' => 'email',
        'message' => 'Reminder',
    ])->assertSessionHasErrors('subject');
});

test('sending twice to the same contact within one call does not violate the recipient unique constraint', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create();

    $this->post('/contacts/send-notification', [
        'ids' => [$contact->id, $contact->id],
        'channel' => 'sms',
        'message' => 'Reminder',
    ])->assertRedirect();

    expect(CampaignRecipient::count())->toBe(1);
});

test('a contact with a long ledger is paged and each page carries the running balance forward', function () {
    $this->actingAs(User::factory()->create());
    $contact = Contact::factory()->create();
    foreach (range(1, 130) as $n) {
        ContactLedger::factory()->create([
            'contact_id' => $contact->id,
            'type' => ContactLedgerType::SaleInvoice,
            'amount' => 10,
            'created_at' => now()->subMinutes(200 - $n),
        ]);
    }

    // opens on the newest page: the 30 latest entries, behind a "carried" row holding the first 100
    $this->get("/contacts/{$contact->id}")
        ->assertInertia(fn ($page) => $page
            ->where('ledgerPagination.total', 130)
            ->where('ledgerPagination.current_page', 2)
            ->has('ledger', 31)
            ->where('ledger.0.id', 0)
            ->where('ledger.0.balance', 1000)
            ->where('ledger.30.balance', 1300));

    $this->get("/contacts/{$contact->id}?page=1")
        ->assertInertia(fn ($page) => $page
            ->has('ledger', 100)
            ->where('ledger.0.balance', 10)
            ->where('ledger.99.balance', 1000));
});

test('the sale form\'s quick-add customer posts first/middle/last name and gets the contact back as JSON', function () {
    $this->actingAs(User::factory()->create());

    $this->postJson('/contacts', [
        'name' => 'John Michael Doe',
        'first_name' => 'John',
        'middle_name' => 'Michael',
        'last_name' => 'Doe',
        'phone' => '01712345678',
        'type' => 'customer',
        'entity_type' => 'individual',
        'is_active' => true,
    ])->assertSuccessful()->assertJsonFragment(['name' => 'John Michael Doe']);

    expect(Contact::query()->sole()->only(['first_name', 'middle_name', 'last_name']))
        ->toBe(['first_name' => 'John', 'middle_name' => 'Michael', 'last_name' => 'Doe']);

    // The old payload — a single `name` — is what used to fail with "first name field is required".
    $this->postJson('/contacts', ['name' => 'Only Name', 'phone' => '01799999999', 'type' => 'customer', 'entity_type' => 'individual', 'is_active' => true])
        ->assertUnprocessable()->assertJsonValidationErrors(['first_name', 'last_name']);
});
