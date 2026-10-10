<?php

namespace App\Console\Commands;

use App\Enums\NormalBalance;
use App\Enums\StockMovementType;
use App\Models\Account;
use App\Models\Asset;
use App\Models\ChartOfAccount;
use App\Models\CompanyLoan;
use App\Models\Contact;
use App\Models\Investor;
use App\Models\OtherLiability;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Daily safety net against subsidiary-ledger/General-Ledger divergence
 * (পর্ব ৬.৫) — since every module writes both a fast operational
 * subsidiary ledger (Contact.balance, Product.current_stock) and a
 * General Ledger journal entry in the same transaction, a bug in either
 * path could silently desync them. This never auto-corrects anything —
 * only logs a warning naming the mismatch, so it gets investigated
 * immediately (there's no notification system yet — Phase 17 — to alert
 * through instead, same deferral `emi:mark-overdue` already made).
 *
 * Beyond subsidiary-vs-GL it also checks that each cached running balance
 * still equals what its own source rows add up to — the database holds those
 * rules nowhere else (every journal entry balancing, an account's balance,
 * a loan's outstanding amount...), so this is the check that proves the data
 * is still sound years later.
 *
 * Which record wins when two disagree (see doc/data-integrity.md): for money the
 * General Ledger (journal entries + lines) is the source of truth; for stock it is
 * the stock_movements log. `account_transactions` is the operational register that
 * must agree with the journal, and every "balance" / "current_*" column is only a
 * cache of one of them — kept for speed and for row-locked checks, never trusted
 * over its source.
 */
class CheckReconciliation extends Command
{
    protected $signature = 'reconciliation:check {--fix : Recalculate contact balances, product stocks and the loan/asset/investor/liability balances before checking}';

    protected $description = 'Compare subsidiary ledger totals against their General Ledger counterparts and log any mismatch';

    /** Where the last run's verdict is kept, for the dashboard's books-check line. */
    public const LAST_RUN_CACHE_KEY = 'reconciliation.last_run';

    /** @var list<string> The checks that found something wrong in this run. */
    private array $failedChecks = [];

    private const TOLERANCE = 0.01;

    /** Stock is held to 4 decimals, so it is compared far more tightly than money. */
    private const STOCK_TOLERANCE = 0.0001;

    public function handle(): void
    {
        if ($this->option('fix')) {
            $this->info('Recalculating contact balances and product stocks...');
            Contact::query()->each(fn (Contact $c) => $c->recalculateBalance());
            Product::query()->each(fn (Product $p) => $p->recalculateStock());
            foreach ([Asset::class, CompanyLoan::class, Investor::class, OtherLiability::class] as $model) {
                $model::query()->each(fn ($row) => $row->recalculateLedgerBalance());
            }
            $this->info('Recalculation complete.');
        }

        $this->checkReceivable();
        $this->checkPayable();
        $this->checkInventory();
        $this->checkJournalEntriesBalance();
        $this->checkChartOfAccountBalances();
        $this->checkAccountBalances();
        $this->checkLedgerBalances();
        $this->checkProductStocks();
        $this->checkAccountRegisterAgainstJournal();
        $this->checkAccountOpeningBalances();

        Cache::forever(self::LAST_RUN_CACHE_KEY, [
            'checked_at' => now()->toIso8601String(),
            'failed_checks' => $this->failedChecks,
        ]);
    }

    /**
     * Each product's cached stock must equal what its own movements add up to. The grand total of stock
     * value is already compared with the Inventory account above, but that hides one product being off
     * by one — or two products being off in opposite directions.
     */
    private function checkProductStocks(): void
    {
        $increasing = array_values(array_map(
            fn (StockMovementType $type) => $type->value,
            array_filter(StockMovementType::cases(), fn (StockMovementType $type) => $type->increasesStock()),
        ));

        $placeholders = implode(',', array_fill(0, count($increasing), '?'));

        $sums = DB::table('stock_movements')
            ->select('product_id')
            ->selectRaw("SUM(CASE WHEN type IN ({$placeholders}) THEN quantity ELSE -quantity END) as net", $increasing)
            ->groupBy('product_id')
            ->pluck('net', 'product_id');

        $mismatches = [];

        foreach (Product::query()->get(['id', 'name', 'sku', 'current_stock']) as $product) {
            $expected = round((float) ($sums[$product->id] ?? 0), 4);

            if (abs($expected - (float) $product->current_stock) > self::STOCK_TOLERANCE) {
                $mismatches[] = "{$product->name}".($product->sku ? " ({$product->sku})" : '').": cached {$product->current_stock}, movements say {$expected}";
            }
        }

        $this->report('Product stock vs movements', array_slice($mismatches, 0, 50));
    }

    /**
     * The payment-account register (account_transactions) and the General Ledger are written by two
     * separate code paths; this is the one place the two are set side by side. A cash/bank account's
     * transactions must add up to the journal lines on the ledger account it posts against.
     */
    private function checkAccountRegisterAgainstJournal(): void
    {
        $registerByChart = DB::table('account_transactions')
            ->join('accounts', 'accounts.id', '=', 'account_transactions.account_id')
            ->select('accounts.chart_of_account_id')
            ->selectRaw('SUM(account_transactions.amount) as total')
            ->groupBy('accounts.chart_of_account_id')
            ->pluck('total', 'chart_of_account_id');

        $journalByChart = DB::table('journal_entry_lines')
            ->select('chart_of_account_id')
            ->selectRaw('SUM(debit) - SUM(credit) as net')
            ->groupBy('chart_of_account_id')
            ->pluck('net', 'chart_of_account_id');

        $mismatches = [];

        $linked = ChartOfAccount::query()
            ->whereIn('id', Account::query()->select('chart_of_account_id'))
            ->get(['id', 'code', 'name', 'normal_balance']);

        foreach ($linked as $chart) {
            $register = round((float) ($registerByChart[$chart->id] ?? 0), 2);
            $net = (float) ($journalByChart[$chart->id] ?? 0);
            $journal = round($chart->normal_balance === NormalBalance::Debit ? $net : -$net, 2);

            if (abs($register - $journal) > self::TOLERANCE) {
                $mismatches[] = "{$chart->code} {$chart->name}: account register {$register}, journal {$journal}";
            }
        }

        $this->report('Account register vs journal', $mismatches);
    }

    /**
     * `accounts.opening_balance` repeats what the opening transaction already says; a hand edit of one
     * would otherwise leave the two quietly disagreeing.
     */
    private function checkAccountOpeningBalances(): void
    {
        $openings = DB::table('account_transactions')
            ->where('type', 'opening_balance')
            ->select('account_id')
            ->selectRaw('SUM(amount) as total')
            ->groupBy('account_id')
            ->pluck('total', 'account_id');

        $mismatches = [];

        foreach (Account::query()->get(['id', 'name', 'opening_balance']) as $account) {
            $recorded = round((float) ($openings[$account->id] ?? 0), 2);

            if (abs($recorded - (float) $account->opening_balance) > self::TOLERANCE) {
                $mismatches[] = "{$account->name}: opening_balance column {$account->opening_balance}, opening transaction {$recorded}";
            }
        }

        $this->report('Account opening balances', $mismatches);
    }

    /**
     * Double entry's one rule: every journal entry's debits equal its credits. The application enforces it
     * on the way in; this proves nothing has slipped past it since.
     */
    private function checkJournalEntriesBalance(): void
    {
        $unbalanced = DB::table('journal_entry_lines')
            ->select('journal_entry_id')
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->groupBy('journal_entry_id')
            // The constant is inlined on purpose: a bound float travels as text on SQLite, where every number sorts below any text.
            ->havingRaw('ABS(SUM(debit) - SUM(credit)) > '.self::TOLERANCE)
            ->limit(20)
            ->get();

        $this->report('Journal entries balanced', $unbalanced->map(fn ($row) => "entry #{$row->journal_entry_id}: debit {$row->total_debit} vs credit {$row->total_credit}")->all());
    }

    /**
     * Each chart-of-accounts balance is a cached total of its journal lines.
     */
    private function checkChartOfAccountBalances(): void
    {
        $sums = DB::table('journal_entry_lines')
            ->select('chart_of_account_id')
            ->selectRaw('SUM(debit) - SUM(credit) as net')
            ->groupBy('chart_of_account_id')
            ->pluck('net', 'chart_of_account_id');

        $mismatches = [];

        foreach (ChartOfAccount::query()->get(['id', 'code', 'name', 'normal_balance', 'balance']) as $account) {
            $net = (float) ($sums[$account->id] ?? 0);
            $expected = round($account->normal_balance === NormalBalance::Debit ? $net : -$net, 2);

            if (abs($expected - (float) $account->balance) > self::TOLERANCE) {
                $mismatches[] = "{$account->code} {$account->name}: cached {$account->balance}, journal says {$expected}";
            }
        }

        $this->report('Chart of accounts balances', $mismatches);
    }

    /**
     * A payment account's balance is the sum of its own transactions (the opening balance is one of them).
     */
    private function checkAccountBalances(): void
    {
        $sums = DB::table('account_transactions')
            ->select('account_id')
            ->selectRaw('SUM(amount) as total')
            ->groupBy('account_id')
            ->pluck('total', 'account_id');

        $mismatches = [];

        foreach (Account::query()->get(['id', 'name', 'current_balance']) as $account) {
            $expected = round((float) ($sums[$account->id] ?? 0), 2);

            if (abs($expected - (float) $account->current_balance) > self::TOLERANCE) {
                $mismatches[] = "{$account->name}: cached {$account->current_balance}, transactions say {$expected}";
            }
        }

        $this->report('Payment account balances', $mismatches);
    }

    /**
     * Loan / asset / investor / other-liability headers cache a running balance of their transaction log.
     */
    private function checkLedgerBalances(): void
    {
        $mismatches = [];
        $columns = [
            Asset::class => ['current_value', 'name'],
            CompanyLoan::class => ['outstanding_balance', 'lender_name'],
            Investor::class => ['total_invested', 'name'],
            OtherLiability::class => ['current_balance', 'name'],
        ];

        foreach ($columns as $model => [$column, $label]) {
            foreach ($model::query()->get() as $row) {
                $expected = round((float) $row->transactions()->sum('amount'), 2);

                if (abs($expected - (float) $row->{$column}) > self::TOLERANCE) {
                    $mismatches[] = class_basename($model)." \"{$row->{$label}}\": cached {$row->{$column}}, ledger says {$expected}";
                }
            }
        }

        $this->report('Loan / asset / investor / liability balances', $mismatches);
    }

    /**
     * @param  list<string>  $problems
     */
    private function report(string $label, array $problems): void
    {
        if ($problems === []) {
            $this->info("{$label}: OK");

            return;
        }

        Log::warning("Reconciliation mismatch: {$label}", ['problems' => $problems]);
        $this->failedChecks[] = $label;

        $this->warn("{$label}: ".count($problems).' problem(s)');
        foreach ($problems as $problem) {
            $this->line("  - {$problem}");
        }
    }

    private function checkReceivable(): void
    {
        // A customer's balance is signed: owed to us (+), or credit we hold (−) after an overpayment or an advance.
        // Customer-only contacts count with their sign; a customer-and-supplier ("both") contact counts only the
        // part owed to us (its credit side is Accounts Payable's, below).
        $subsidiary = (float) Contact::query()->where('type', 'customer')->sum('balance')
            + (float) Contact::query()->where('type', 'both')->where('balance', '>', 0)->sum('balance');

        // The books hold an advance (a sales-order deposit) in Customer Advances (2150), not in Receivable, while the
        // customer's own balance already nets it off — so the customers must add up to Receivable less Advances.
        $this->compare('Accounts Receivable', $subsidiary, '1100', '2150');
    }

    private function checkPayable(): void
    {
        $subsidiary = abs((float) Contact::query()
            ->whereIn('type', ['supplier', 'both'])
            ->where('balance', '<', 0)
            ->sum('balance'));

        $this->compare('Accounts Payable', $subsidiary, '2100');
    }

    private function checkInventory(): void
    {
        $subsidiary = (float) DB::table('products')->selectRaw('SUM(current_stock * avg_cost) as value')->value('value');

        $this->compare('Inventory', $subsidiary, '1200');
    }

    /**
     * @param  string|null  $lessChartOfAccountCode  an account whose balance is held apart in the books but already netted off in the subsidiary figure
     */
    private function compare(string $label, float $subsidiaryTotal, string $chartOfAccountCode, ?string $lessChartOfAccountCode = null): void
    {
        $balanceOf = fn (string $code): float => (float) (ChartOfAccount::query()->where('code', $code)->value('balance') ?? 0);

        $glBalance = $balanceOf($chartOfAccountCode) - ($lessChartOfAccountCode !== null ? $balanceOf($lessChartOfAccountCode) : 0.0);
        $difference = round($subsidiaryTotal - $glBalance, 2);

        if (abs($difference) > self::TOLERANCE) {
            Log::warning("Reconciliation mismatch: {$label}", [
                'subsidiary_total' => $subsidiaryTotal,
                'gl_balance' => $glBalance,
                'difference' => $difference,
                'chart_of_account_code' => $chartOfAccountCode,
            ]);

            $this->warn("{$label} mismatch: subsidiary={$subsidiaryTotal}, GL={$glBalance}, diff={$difference}");
            $this->failedChecks[] = $label;

            return;
        }

        $this->info("{$label}: reconciled ({$subsidiaryTotal})");
    }
}
