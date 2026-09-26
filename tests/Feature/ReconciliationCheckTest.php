<?php

use App\Models\Contact;
use App\Models\Settings;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    Settings::factory()->create();
});

test('reconciliation check logs a warning when the subsidiary ledger diverges from the General Ledger', function () {
    // Created directly via the factory (not CreateContactAction), so the
    // balance never posted a matching journal entry — a genuine divergence.
    Contact::factory()->create(['type' => 'customer', 'balance' => 1000]);

    Log::shouldReceive('warning')
        ->once()
        ->withArgs(fn (string $message) => str_contains($message, 'Accounts Receivable'));

    $this->artisan('reconciliation:check')->assertSuccessful();
});

test('reconciliation check finds nothing to report when there is no data at all', function () {
    Log::shouldReceive('warning')->never();

    $this->artisan('reconciliation:check')->assertSuccessful();
});
