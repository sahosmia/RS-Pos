<?php

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Enums\AccountTransactionType;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\CompanyLoan;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Settings;
use App\Models\User;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Settings::factory()->create();
});

function postBalancedEntry(float $amount = 100): int
{
    $chart = app(ChartOfAccountResolver::class);

    return app(JournalService::class)->post(today(), 'Test entry', [
        ['chart_of_account_id' => $chart->code('1010')->id, 'debit' => $amount, 'credit' => 0],
        ['chart_of_account_id' => $chart->code('3300')->id, 'debit' => 0, 'credit' => $amount],
    ])->id;
}

test('reconciliation passes on sound data', function () {
    postBalancedEntry();

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Journal entries balanced: OK')
        ->expectsOutputToContain('Chart of accounts balances: OK')
        ->expectsOutputToContain('Payment account balances: OK')
        ->expectsOutputToContain('Loan / asset / investor / liability balances: OK')
        ->assertSuccessful();
});

test('reconciliation catches a journal entry whose debits and credits no longer match', function () {
    $entryId = postBalancedEntry(100);

    DB::table('journal_entry_lines')->where('journal_entry_id', $entryId)->where('debit', '>', 0)->update(['debit' => 999]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Journal entries balanced: 1 problem(s)')
        ->expectsOutputToContain("entry #{$entryId}")
        ->assertSuccessful();
});

test('reconciliation catches a chart of accounts balance that drifted from its journal lines', function () {
    postBalancedEntry(100);

    DB::table('chart_of_accounts')->where('code', '1010')->update(['balance' => 5]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Chart of accounts balances: 1 problem(s)')
        ->assertSuccessful();
});

test('reconciliation catches a payment account whose balance does not match its transactions', function () {
    Account::factory()->create(['account_type_id' => AccountType::factory()->create()->id, 'name' => 'Drifted Cash', 'current_balance' => 100]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Payment account balances: 1 problem(s)')
        ->expectsOutputToContain('Drifted Cash')
        ->assertSuccessful();
});

test('--fix repairs a drifted loan balance from its transaction log', function () {
    $this->actingAs(User::factory()->create());
    $loan = CompanyLoan::create(['lender_name' => 'City Bank', 'loan_amount' => 1000, 'start_date' => today()]);
    $loan->addLedgerTransaction('opening_loan', 400);

    DB::table('company_loans')->where('id', $loan->id)->update(['outstanding_balance' => 9999]);

    $this->artisan('reconciliation:check')->expectsOutputToContain('Loan / asset / investor / liability balances: 1 problem(s)')->assertSuccessful();

    $this->artisan('reconciliation:check', ['--fix' => true])->expectsOutputToContain('Loan / asset / investor / liability balances: OK')->assertSuccessful();

    expect($loan->fresh()->outstanding_balance)->toBe(400.0);
});

test('updated_by records who last changed a row, and only when something really changed', function () {
    $author = User::factory()->create();
    $editor = User::factory()->create();

    $this->actingAs($author);
    $expense = Expense::factory()->create(['note' => 'first']);

    expect($expense->created_by)->toBe($author->id)->and($expense->updated_by)->toBeNull();

    $this->actingAs($editor);
    $expense->save(); // nothing changed
    expect($expense->fresh()->updated_by)->toBeNull();

    $expense->update(['note' => 'second']);
    expect($expense->fresh()->updated_by)->toBe($editor->id)->and($expense->fresh()->created_by)->toBe($author->id);
});

test('money and quantity columns share one precision', function () {
    $product = Product::factory()->create(['selling_price' => 1234.5678, 'current_stock' => 12.3456]);

    expect($product->fresh()->selling_price)->toBe(1234.5678)->and($product->fresh()->current_stock)->toBe(12.3456);
});

test('reconciliation catches a single product whose stock drifted from its movements', function () {
    $product = Product::factory()->create(['name' => 'Fridge 300L', 'current_stock' => 0]);
    app(StockService::class)->increase($product, 10, StockMovementType::OpeningStock);

    DB::table('products')->where('id', $product->id)->update(['current_stock' => 11]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Product stock vs movements: 1 problem(s)')
        ->expectsOutputToContain('Fridge 300L')
        ->assertSuccessful();
});

test('two products drifting in opposite directions are both caught even though the total value still agrees', function () {
    $a = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 100]);
    $b = Product::factory()->create(['current_stock' => 0, 'avg_cost' => 100]);
    $stock = app(StockService::class);
    $stock->increase($a, 10, StockMovementType::OpeningStock);
    $stock->increase($b, 10, StockMovementType::OpeningStock);

    DB::table('products')->where('id', $a->id)->update(['current_stock' => 11]);
    DB::table('products')->where('id', $b->id)->update(['current_stock' => 9]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Product stock vs movements: 2 problem(s)')
        ->assertSuccessful();
});

test('--fix rebuilds stock from movements and keeps fractional quantities intact', function () {
    $product = Product::factory()->create(['current_stock' => 0]);
    $stock = app(StockService::class);
    $stock->increase($product, 2.5, StockMovementType::OpeningStock);
    $stock->decrease($product->fresh(), 0.125, StockMovementType::Sale);

    DB::table('products')->where('id', $product->id)->update(['current_stock' => 50]);

    $this->artisan('reconciliation:check', ['--fix' => true])
        ->expectsOutputToContain('Product stock vs movements: OK')
        ->assertSuccessful();

    expect($product->fresh()->current_stock)->toBe(2.375);
});

test('reconciliation sets the account register beside the journal and catches a missing journal entry', function () {
    $account = app(CreateAccountAction::class)->execute([
        'name' => 'Petty Bank',
        'account_type_id' => AccountType::factory()->create()->id,
        'opening_balance' => 1000,
    ]);

    $this->artisan('reconciliation:check')->expectsOutputToContain('Account register vs journal: OK')->assertSuccessful();

    // Money moves in the register but no journal entry is posted — the very failure this check exists for.
    app(AccountService::class)->record($account, AccountTransactionType::Adjustment, 250, today());

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Account register vs journal: 1 problem(s)')
        ->expectsOutputToContain('account register 1250')
        ->assertSuccessful();
});

test('reconciliation catches an opening_balance column that no longer matches the opening transaction', function () {
    $account = app(CreateAccountAction::class)->execute([
        'name' => 'Cash Box',
        'account_type_id' => AccountType::factory()->create()->id,
        'opening_balance' => 500,
    ]);

    $this->artisan('reconciliation:check')->expectsOutputToContain('Account opening balances: OK')->assertSuccessful();

    DB::table('accounts')->where('id', $account->id)->update(['opening_balance' => 999]);

    $this->artisan('reconciliation:check')
        ->expectsOutputToContain('Account opening balances: 1 problem(s)')
        ->expectsOutputToContain('Cash Box')
        ->assertSuccessful();
});
