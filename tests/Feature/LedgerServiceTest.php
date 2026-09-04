<?php

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Services\LedgerService;

test('recordContact stores the entry and moves the cached balance together', function () {
    $contact = Contact::factory()->create(['balance' => 0]);

    $entry = app(LedgerService::class)->recordContact(
        $contact,
        ContactLedgerType::SaleInvoice,
        1500.50,
        'sale',
        7,
    );

    expect($entry->type)->toBe(ContactLedgerType::SaleInvoice)
        ->and($entry->reference_type)->toBe('sale')
        ->and($entry->reference_id)->toBe(7)
        ->and($contact->fresh()->balance)->toBe(1500.50);
});

test('a negative amount grows what we owe the contact', function () {
    $contact = Contact::factory()->create(['balance' => 1000]);

    app(LedgerService::class)->recordContact(
        $contact,
        ContactLedgerType::PaymentReceived,
        -400,
    );

    expect($contact->fresh()->balance)->toBe(600.0);
});
