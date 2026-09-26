<?php

use App\Enums\AssetTransactionType;
use App\Enums\BalanceEffect;
use App\Enums\InvestorTransactionType;
use App\Enums\LoanTransactionType;
use App\Enums\OtherLiabilityTransactionType;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\AccountType;
use App\Models\Asset;
use App\Models\CompanyLoan;
use App\Models\Contact;
use App\Models\ContactLedger;
use App\Models\Investor;
use App\Models\OtherLiability;
use App\Models\Product;
use App\Models\Settings;
use App\Models\Staff;
use App\Models\StaffLedger;
use App\Models\StaffTransactionType;
use App\Models\StockMovement;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Settings::factory()->create();
    Carbon::setTestNow('2026-09-25');
});

afterEach(function () {
    Carbon::setTestNow();
});

test('guests are redirected to the login page', function () {
    $this->get('/reports/financial-position')->assertRedirect('/login');
});

test('a user without financial_position.view is forbidden', function () {
    $this->actingAs(userWithPermissions([]))->get('/reports/financial-position')->assertForbidden();
});

test('the financial position report sums every module as of end_date and balances assets against liabilities', function () {
    $this->actingAs(userWithPermissions(['financial_position.view']));
    $endDate = '2026-09-10';
    $before = '2026-09-01';
    $after = '2026-09-20';

    // `created_at` isn't mass-assignable on any of these ledger tables (only
    // real business dates like `operation_date` are) — Eloquent's own
    // auto-timestamp is the only reliable way to backdate a row, so this
    // travels there, creates, and travels back rather than passing
    // `created_at` through `::create()`, which would just be silently
    // dropped and default to "now".
    Carbon::setTestNow($before);

    $asset = Asset::factory()->create();
    $asset->transactions()->create(['type' => AssetTransactionType::OpeningAsset, 'amount' => 5000]);

    $loan = CompanyLoan::factory()->create();
    $loan->transactions()->create(['type' => LoanTransactionType::Disbursement, 'amount' => 20000]);

    $investor = Investor::factory()->create();
    $investor->transactions()->create(['type' => InvestorTransactionType::Investment, 'amount' => 30000]);

    $liability = OtherLiability::factory()->create();
    $liability->transactions()->create(['type' => OtherLiabilityTransactionType::OpeningLiability, 'amount' => 2000]);

    $increaseType = StaffTransactionType::factory()->create(['effect_on_balance' => BalanceEffect::Increase]);
    $decreaseType = StaffTransactionType::factory()->create(['effect_on_balance' => BalanceEffect::Decrease]);
    $staffWithAdvance = Staff::factory()->create();
    $staffWithPayable = Staff::factory()->create();
    StaffLedger::create(['staff_id' => $staffWithAdvance->id, 'staff_transaction_type_id' => $increaseType->id, 'amount' => 1500]);
    StaffLedger::create(['staff_id' => $staffWithPayable->id, 'staff_transaction_type_id' => $decreaseType->id, 'amount' => 800]);

    $debtor = Contact::factory()->create();
    $creditor = Contact::factory()->create();
    ContactLedger::create(['contact_id' => $debtor->id, 'type' => 'sale_invoice', 'amount' => 3000]);
    ContactLedger::create(['contact_id' => $creditor->id, 'type' => 'purchase_bill', 'amount' => -1200]);

    $product = Product::factory()->create(['avg_cost' => 50, 'current_stock' => 10]);
    StockMovement::create(['product_id' => $product->id, 'type' => StockMovementType::Purchase, 'quantity' => 10]);

    // Cash at Bank uses its own real `operation_date` column, not `created_at`.
    $accountType = AccountType::factory()->create();
    $account = Account::factory()->create(['account_type_id' => $accountType->id, 'current_balance' => 10500]);
    AccountTransaction::create(['account_id' => $account->id, 'type' => 'opening_balance', 'amount' => 10000, 'operation_date' => $before]);
    AccountTransaction::create(['account_id' => $account->id, 'type' => 'opening_balance', 'amount' => 500, 'operation_date' => $after]);

    // One more asset transaction, dated after the cutoff — must not count.
    Carbon::setTestNow($after);
    $asset->transactions()->create(['type' => AssetTransactionType::Addition, 'amount' => 1000]);

    Carbon::setTestNow('2026-09-25');

    $response = $this->get("/reports/financial-position?end_date={$endDate}")->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('reports/financial-position')
        ->where('report.end_date', $endDate)
        ->where('report.assets.closing_stock.total', 500)
        ->where('report.assets.sundry_debtors.total', 3000)
        // One combined line: +1500 advance, -800 payable nets to 700.
        ->where('report.assets.staff_advances.total', 700)
        ->where('report.assets.cash_and_bank.total', 10000)
        ->where('report.assets.other_assets.total', 5000)
        ->where('report.assets.total', 19200)
        ->where('report.liabilities.investor_capital.total', 30000)
        ->where('report.liabilities.company_loans.total', 20000)
        ->where('report.liabilities.sundry_creditors.total', 1200)
        ->where('report.liabilities.other_liabilities.total', 2000)
        ->where('report.liabilities.net_profit', -34000)
        ->where('report.liabilities.total', 19200));
});

test('the AJAX variant returns JSON for a different end_date without a full page reload', function () {
    $this->actingAs(userWithPermissions(['financial_position.view']));

    $this->getJson('/reports/financial-position?end_date=2026-01-01')
        ->assertOk()
        ->assertJsonPath('report.end_date', '2026-01-01')
        ->assertJsonStructure(['report' => ['assets', 'liabilities']]);
});
