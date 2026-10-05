<?php

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Settings;
use App\Models\Staff;
use App\Models\User;
use App\Support\FiscalYear;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Settings::factory()->create(['fiscal_year_start_month' => 7]);
    $this->actingAs(User::factory()->create());
});

/**
 * A real Cash-type account, created through CreateAccountAction so it's
 * properly linked under Chart of Accounts 1010 — a bare Account::factory()
 * gets its own standalone ChartOfAccount instead (see AccountFactory),
 * which would never show up under the Balance Sheet's Cash+Bank subtree.
 */
function cashAccountForReports(): Account
{
    $accountType = AccountType::query()->firstOrCreate(['name' => 'Cash']);
    $account = app(CreateAccountAction::class)->execute(['name' => 'Test Cash Drawer '.uniqid(), 'account_type_id' => $accountType->id]);

    return $account->fresh();
}

function confirmSaleForReports(Contact $customer, Product $product, int $quantity, float $unitPrice, string $saleDate, ?Account $account = null, ?float $paidAmount = null): Sale
{
    $account ??= cashAccountForReports();
    $total = $quantity * $unitPrice;
    $paidAmount ??= $total;

    $payload = [
        'customer_id' => $customer->id,
        'sale_date' => $saleDate,
        'status' => 'confirmed',
        'items' => [
            ['product_id' => $product->id, 'quantity' => $quantity, 'unit_price' => $unitPrice],
        ],
    ];

    if ($paidAmount > 0) {
        $payload['payments'] = [['account_id' => $account->id, 'amount' => $paidAmount]];
    }

    test()->post('/sales', $payload)->assertRedirect();

    return Sale::query()->latest('id')->firstOrFail();
}

test('FiscalYear::containing resolves the correct start/end for both sides of the start month', function () {
    $afterStart = FiscalYear::containing(Carbon::parse('2026-09-06'), 7);
    $beforeStart = FiscalYear::containing(Carbon::parse('2026-03-15'), 7);

    expect($afterStart['start']->toDateString())->toBe('2026-07-01')
        ->and($afterStart['end']->toDateString())->toBe('2027-06-30')
        ->and($beforeStart['start']->toDateString())->toBe('2025-07-01')
        ->and($beforeStart['end']->toDateString())->toBe('2026-06-30');
});

test('profit and loss report computes net profit from confirmed sale revenue and COGS within the date range', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'avg_cost' => 600, 'current_stock' => 10]);

    confirmSaleForReports($customer, $product, 2, 1000, '2026-03-01');
    confirmSaleForReports($customer, $product, 1, 1000, '2020-01-01'); // outside range, must be excluded

    $this->get('/reports/profit-loss?from=2026-01-01&to=2026-12-31')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/profit-loss')
            ->where('totalIncome', 2000)
            ->where('totalExpense', 1200)
            ->where('netProfit', 800));
});

test('balance sheet full financial position always keeps assets equal to liabilities plus equity plus net profit', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'avg_cost' => 600, 'current_stock' => 10]);

    confirmSaleForReports($customer, $product, 3, 1000, '2026-03-01', null, 1500.0);

    $this->get('/reports/balance-sheet')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/balance-sheet')
            ->where('full', fn ($full) => round($full['assetsTotal'] - $full['liabilitiesAndEquityTotal'], 2) === 0.0));
});

test('balance sheet quick view reports the customer due as receivable and cash received as cash-and-bank', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'avg_cost' => 600, 'current_stock' => 10]);

    confirmSaleForReports($customer, $product, 2, 1000, '2026-03-01', null, 1200.0);

    $this->get('/reports/balance-sheet')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/balance-sheet')
            ->where('quick.receivable', 800)
            ->where('quick.cashAndBank', 1200));
});

test('trial balance always keeps total debit equal to total credit', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 500, 'avg_cost' => 300, 'current_stock' => 10]);

    confirmSaleForReports($customer, $product, 4, 500, '2026-03-01');

    $this->get('/reports/trial-balance')
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->component('reports/trial-balance');

            $totalDebit = null;
            $page->where('totalDebit', function ($value) use (&$totalDebit) {
                $totalDebit = $value;

                return $value > 0;
            });
            $page->where('totalCredit', fn ($value) => $value === $totalDebit);
        });
});

test('cash flow report sums account transactions by type within the date range', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'avg_cost' => 600, 'current_stock' => 10]);
    $account = Account::factory()->create(['account_type_id' => AccountType::factory(), 'current_balance' => 0]);

    confirmSaleForReports($customer, $product, 1, 1000, '2026-03-01', $account, 1000.0);

    $this->get('/reports/cash-flow?from=2026-01-01&to=2026-12-31')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/cash-flow')
            ->where('moneyIn', 1000)
            ->where('byType.0.type', 'sale_payment'));
});

test('stock report computes stock value and flags low/out-of-stock products', function () {
    Product::factory()->create(['name' => 'Healthy Stock', 'current_stock' => 20, 'avg_cost' => 100, 'minimum_stock_level' => 5]);
    Product::factory()->create(['name' => 'Low Stock', 'current_stock' => 2, 'avg_cost' => 50, 'minimum_stock_level' => 5]);
    Product::factory()->create(['name' => 'Out Of Stock', 'current_stock' => 0, 'avg_cost' => 10, 'minimum_stock_level' => 5]);

    $this->get('/reports/stock')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/stock-report')
            ->where('totalValue', 2100)
            ->where('lowStockCount', 2));
});

test('due report lists customer receivable, supplier payable, and staff balances with correct signs', function () {
    Contact::factory()->create(['name' => 'Due Customer', 'type' => 'customer', 'balance' => 500]);
    Contact::factory()->create(['name' => 'Due Supplier', 'type' => 'supplier', 'balance' => -300]);
    Staff::factory()->create(['name' => 'Advance Staff', 'balance' => 150]);

    $this->get('/reports/due')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/due-report')
            ->where('customers.0.balance', 500)
            ->where('suppliers.0.balance', 300)
            ->where('staff.0.balance', 150)
            ->where('totalReceivable', 500)
            ->where('totalPayable', 300));
});

test('trending products ranks by quantity sold and only counts confirmed sales', function () {
    $customer = Contact::factory()->create();
    $bestSeller = Product::factory()->create(['name' => 'Best Seller', 'selling_price' => 100, 'current_stock' => 50]);
    $slowMover = Product::factory()->create(['name' => 'Slow Mover', 'selling_price' => 200, 'current_stock' => 50]);

    confirmSaleForReports($customer, $bestSeller, 10, 100, '2026-03-01');
    confirmSaleForReports($customer, $slowMover, 1, 200, '2026-03-02');

    // A draft sale never confirmed — must not count.
    $this->post('/sales', [
        'customer_id' => $customer->id,
        'sale_date' => '2026-03-03',
        'status' => 'draft',
        'items' => [['product_id' => $slowMover->id, 'quantity' => 99, 'unit_price' => 200]],
    ]);

    $this->get('/reports/trending-products?from=2026-01-01&to=2026-12-31')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/trending-products')
            ->where('rows.0.name', 'Best Seller')
            ->where('rows.0.quantity_sold', 10)
            ->where('rows.1.quantity_sold', 1));
});

test('dashboard summary shows today figures and GL-sourced receivable/payable/cash', function () {
    $customer = Contact::factory()->create();
    $product = Product::factory()->create(['selling_price' => 1000, 'avg_cost' => 600, 'current_stock' => 10]);

    confirmSaleForReports($customer, $product, 1, 1000, Carbon::today()->toDateString(), null, 600.0);

    $this->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('range.preset', 'today')
            ->where('metrics.totalSales', 1000)
            ->where('balances.totalReceivable', 400)
            ->where('balances.cashAndBank', 600));
});
