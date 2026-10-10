<?php

use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tables that are knowingly empty after seeding: framework plumbing, and data only a person creates
 * (uploaded files, per-user permission overrides). Everything else in the schema must get seeded rows from some
 * seeder — so a migration that adds a table fails here until a seeder covers it (or it is listed on purpose).
 *
 * @var list<string>
 */
const KNOWINGLY_EMPTY_TABLES = [
    'migrations', 'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches', 'failed_jobs', 'password_reset_tokens',
    'media', 'model_has_permissions',

    // Demo transactions: DummyDataSeeder keeps those seeders switched off so a fresh install starts with the
    // shop's setup (accounts, products, contacts) and no invented sales, purchases or money movements.
    // Switch a seeder back on there and its tables simply start having rows; nothing here needs to change.
    'asset_transactions', 'assets', 'campaign_recipients', 'campaigns', 'company_loans', 'emi_installments', 'expenses',
    'fund_transfers', 'investor_transactions', 'investors', 'loan_transactions', 'message_logs', 'notifications',
    'other_incomes', 'other_liabilities', 'other_liability_transactions', 'purchase_items', 'purchase_return_items',
    'purchase_returns', 'purchases', 'sale_item_service_periods', 'sale_items', 'sale_return_items', 'sale_returns',
    'sales', 'sales_order_items', 'sales_orders', 'serial_numbers', 'service_requests', 'staff', 'staff_ledger',
    'warranty_claims',
];

/** @return array<string, int> */
function seededRowCounts(): array
{
    return collect(Schema::getTableListing())
        // SQLite lists tables schema-qualified ("main.users")
        ->map(fn (string $table) => str($table)->afterLast('.')->toString())
        ->reject(fn (string $table) => in_array($table, KNOWINGLY_EMPTY_TABLES, true))
        ->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()])
        ->all();
}

test('db:seed fills every table of the schema, so a new migration needs a seeder', function () {
    $this->seed(DatabaseSeeder::class);

    $empty = array_keys(array_filter(seededRowCounts(), fn (int $rows) => $rows === 0));

    expect($empty)->toBe([], 'Tables with no seeded rows (add a seeder, or list them in KNOWINGLY_EMPTY_TABLES): '.implode(', ', $empty));
});

test('the seeded demo shop reconciles: every ledger agrees with its journal', function () {
    $this->seed(DatabaseSeeder::class);

    Artisan::call('reconciliation:check');
    $output = Artisan::output();

    expect($output)->not->toContain('mismatch')->not->toContain('problem(s)');
});

test('seeding twice changes nothing — every seeder is safe to run again', function () {
    $this->seed(DatabaseSeeder::class);
    $first = seededRowCounts();

    $this->seed(DatabaseSeeder::class);

    expect(seededRowCounts())->toBe($first);
});
