<?php

use App\Console\Commands\CheckReconciliation;
use App\Enums\StockMovementType;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\Product;
use App\Models\Settings;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Cache;
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

test('recalculateBalance on Contact and recalculateStock on Product restore correct figures from transaction logs', function () {
    $contact = Contact::factory()->create(['balance' => 9999]); // desynced balance
    ContactLedger::factory()->create(['contact_id' => $contact->id, 'amount' => 500]);
    ContactLedger::factory()->create(['contact_id' => $contact->id, 'amount' => -200]);

    $contact->recalculateBalance();
    expect($contact->fresh()->balance)->toBe(300.0);

    $product = Product::factory()->create(['current_stock' => 9999]); // desynced stock
    StockMovement::factory()->create([
        'product_id' => $product->id,
        'type' => StockMovementType::Purchase,
        'quantity' => 50,
    ]);
    StockMovement::factory()->create([
        'product_id' => $product->id,
        'type' => StockMovementType::Sale,
        'quantity' => 15,
    ]);

    $product->recalculateStock();
    expect($product->fresh()->current_stock)->toBe(35.0);
});

test('reconciliation check with --fix recalculates balances and stock before checking', function () {
    $contact = Contact::factory()->create(['balance' => 9999]);
    ContactLedger::factory()->create(['contact_id' => $contact->id, 'amount' => 0]);

    $product = Product::factory()->create(['current_stock' => 9999]);
    StockMovement::factory()->create([
        'product_id' => $product->id,
        'type' => StockMovementType::OpeningStock,
        'quantity' => 0,
    ]);

    $this->artisan('reconciliation:check', ['--fix' => true])->assertSuccessful();

    expect($contact->fresh()->balance)->toBe(0.0)
        ->and($product->fresh()->current_stock)->toBe(0.0);
});

test('reconciliation check finds nothing to report when there is no data at all', function () {
    Log::shouldReceive('warning')->never();

    $this->artisan('reconciliation:check')->assertSuccessful();
});

test('the nightly check keeps its verdict for the dashboard: clean, then failing with the check named', function () {
    Cache::forget(CheckReconciliation::LAST_RUN_CACHE_KEY);

    $this->artisan('reconciliation:check')->assertSuccessful();
    expect(Cache::get(CheckReconciliation::LAST_RUN_CACHE_KEY)['failed_checks'])->toBe([]);

    Contact::factory()->create(['type' => 'customer', 'balance' => 1000]);
    Log::spy();
    $this->artisan('reconciliation:check')->assertSuccessful();

    expect(Cache::get(CheckReconciliation::LAST_RUN_CACHE_KEY)['failed_checks'])->toContain('Accounts Receivable');
});

test('only people who may read reports see the books check on the dashboard', function () {
    Cache::forever(CheckReconciliation::LAST_RUN_CACHE_KEY, ['checked_at' => now()->toIso8601String(), 'failed_checks' => ['Inventory']]);

    $this->actingAs(userWithPermissions(['sale.view_own']));
    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('booksCheck', null));

    $this->actingAs(userWithPermissions(['report.view']));
    $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('booksCheck.failed_checks', ['Inventory']));
});
