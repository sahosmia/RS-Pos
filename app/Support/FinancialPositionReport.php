<?php

namespace App\Support;

use App\Models\Account;
use App\Models\Asset;
use App\Models\CompanyLoan;
use App\Models\Contact;
use App\Models\Investor;
use App\Models\OtherLiability;
use App\Models\Product;
use App\Models\Staff;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * "Financial Position" — an as-of-date balance sheet built directly on each
 * module's own balance+ledger pair (Asset, CompanyLoan, Investor,
 * OtherLiability, Staff, Contact, Account), NOT the Chart of Accounts.
 * `BalanceSheetController` already covers the formal double-entry version
 * off Chart of Accounts balances — this is deliberately a second, simpler
 * report for "what do we own/owe as of this date", answerable straight from
 * each module's transaction log without touching the GL at all.
 *
 * Every module here already stores its ledger as a signed `amount` (see
 * `HasLedger`) except Staff, whose `staff_ledger.amount` is an unsigned
 * magnitude — direction comes from the linked `staff_transaction_types.
 * effect_on_balance` instead. None of these ledger tables carry a separate
 * "transaction date" distinct from `created_at` (unlike `account_transactions`,
 * which has its own `operation_date`), so `created_at` is the effective date
 * used everywhere below — there's no other date to prefer.
 *
 * Staff nets into one "Company / Staff Advances" line under Assets — every
 * staff member's signed balance summed together, so the line itself can go
 * negative (net payable) rather than needing its own mirrored liability
 * line. Contacts don't work this way (Debtors/Creditors stay two separate
 * lines) because receivable and payable are both individually significant
 * there; a shop's staff-payable side is comparatively rare/small, so one
 * combined line is what an actual reference report of this shape does.
 */
class FinancialPositionReport
{
    /**
     * Matches DueReportController's own cap — "biggest first", not a full
     * directory, so a shop with thousands of contacts doesn't ship every one
     * of them in a single response. Totals are always summed in the DB
     * first, so they stay correct even when a breakdown list is capped.
     */
    private const MAX_BREAKDOWN_ROWS = 200;

    /**
     * @return array<string, mixed>
     */
    public static function forEndDate(Carbon $endDate): array
    {
        $endDate = $endDate->copy()->endOfDay();

        $closingStock = self::closingStock($endDate);
        $sundryDebtors = self::contactBreakdown($endDate, positive: true);
        $staffAdvances = self::staffAdvancesBreakdown($endDate);
        $cashAndBank = self::cashAndBank($endDate);
        $otherAssets = self::assetBreakdown($endDate);

        $investorCapital = self::investorBreakdown($endDate);
        $companyLoans = self::companyLoanBreakdown($endDate);
        $sundryCreditors = self::contactBreakdown($endDate, positive: false);
        $otherLiabilities = self::otherLiabilityBreakdown($endDate);

        $assetsTotal = round(
            $closingStock['total'] + $sundryDebtors['total'] + $staffAdvances['total'] + $cashAndBank['total'] + $otherAssets['total'],
            2,
        );

        $liabilitiesBeforeProfit = round(
            $investorCapital['total'] + $companyLoans['total'] + $sundryCreditors['total'] + $otherLiabilities['total'],
            2,
        );

        // The balancing figure — never stored/tracked separately, it's whatever
        // makes Total Liabilities equal Total Assets.
        $netProfit = round($assetsTotal - $liabilitiesBeforeProfit, 2);

        return [
            'end_date' => $endDate->toDateString(),
            'assets' => [
                'closing_stock' => $closingStock,
                'sundry_debtors' => $sundryDebtors,
                'staff_advances' => $staffAdvances,
                'cash_and_bank' => $cashAndBank,
                'other_assets' => $otherAssets,
                'total' => $assetsTotal,
            ],
            'liabilities' => [
                'investor_capital' => $investorCapital,
                'company_loans' => $companyLoans,
                'sundry_creditors' => $sundryCreditors,
                'other_liabilities' => $otherLiabilities,
                'net_profit' => $netProfit,
                'total' => round($liabilitiesBeforeProfit + $netProfit, 2),
            ],
        ];
    }

    /**
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function closingStock(Carbon $endDate): array
    {
        // Mirrors StockMovementType::increasesStock() — kept in sync by hand
        // since this is a raw SQL CASE, not the enum itself.
        $increasing = ['opening_stock', 'purchase', 'sale_return', 'adjustment_increase'];

        $quantities = DB::table('stock_movements')
            ->selectRaw(
                'product_id, SUM(CASE WHEN type IN (?, ?, ?, ?) THEN quantity ELSE -quantity END) as qty',
                $increasing,
            )
            ->where('created_at', '<=', $endDate)
            ->groupBy('product_id')
            ->havingRaw('SUM(CASE WHEN type IN (?, ?, ?, ?) THEN quantity ELSE -quantity END) != 0', $increasing)
            ->get()
            ->keyBy('product_id');

        if ($quantities->isEmpty()) {
            return ['total' => 0.0, 'breakdown' => []];
        }

        // Valued at *current* avg_cost — reconstructing the historical weighted-average
        // cost as of a past date isn't done here, so a past end_date's stock value is
        // exact in quantity but approximate in cost basis. Exact for end_date = today.
        $products = Product::query()->whereIn('id', $quantities->keys())->get(['id', 'name', 'avg_cost']);

        $rows = $products->map(fn (Product $product) => [
            'name' => $product->name,
            'amount' => round($quantities[$product->id]->qty * $product->avg_cost, 2),
        ])->sortByDesc('amount')->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->take(self::MAX_BREAKDOWN_ROWS)->all(),
        ];
    }

    /**
     * Sundry Debtors (positive) or Sundry Creditors (negative, shown as a
     * positive "due to pay") — `contact_ledger` already nets every invoice,
     * payment, return, and discount for a contact into one signed balance
     * (see `LedgerService::recordContact`), so this is the same arithmetic
     * `Contact.balance` is cached from, just cut off at `end_date` instead
     * of running to now.
     *
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function contactBreakdown(Carbon $endDate, bool $positive): array
    {
        $balances = DB::table('contact_ledger')
            ->selectRaw('contact_id, SUM(amount) as balance')
            ->where('created_at', '<=', $endDate)
            ->groupBy('contact_id')
            ->havingRaw($positive ? 'SUM(amount) > 0' : 'SUM(amount) < 0')
            ->get()
            ->keyBy('contact_id');

        if ($balances->isEmpty()) {
            return ['total' => 0.0, 'breakdown' => []];
        }

        $contacts = Contact::query()->whereIn('id', $balances->keys())->pluck('name', 'id');

        $rows = $balances->map(fn ($row, $contactId) => [
            'name' => $contacts[$contactId] ?? "Contact #{$contactId}",
            'amount' => round(abs((float) $row->balance), 2),
        ])->sortByDesc('amount')->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->take(self::MAX_BREAKDOWN_ROWS)->all(),
        ];
    }

    /**
     * One combined "Company / Staff Advances" line — every staff member's
     * signed balance (positive = advanced to them, negative = owed to them)
     * summed together, so the line total itself can go negative instead of
     * needing a separate liability-side line. `staff_ledger.amount` is an
     * unsigned magnitude; `staff_transaction_types.effect_on_balance`
     * supplies the sign.
     *
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function staffAdvancesBreakdown(Carbon $endDate): array
    {
        $balances = DB::table('staff_ledger')
            ->join('staff_transaction_types', 'staff_ledger.staff_transaction_type_id', '=', 'staff_transaction_types.id')
            ->selectRaw(
                "staff_ledger.staff_id, SUM(CASE WHEN staff_transaction_types.effect_on_balance = 'increase' THEN staff_ledger.amount WHEN staff_transaction_types.effect_on_balance = 'decrease' THEN -staff_ledger.amount ELSE 0 END) as balance",
            )
            ->where('staff_ledger.created_at', '<=', $endDate)
            ->groupBy('staff_ledger.staff_id')
            ->havingRaw("SUM(CASE WHEN staff_transaction_types.effect_on_balance = 'increase' THEN staff_ledger.amount WHEN staff_transaction_types.effect_on_balance = 'decrease' THEN -staff_ledger.amount ELSE 0 END) != 0")
            ->get()
            ->keyBy('staff_id');

        if ($balances->isEmpty()) {
            return ['total' => 0.0, 'breakdown' => []];
        }

        $staff = Staff::query()->whereIn('id', $balances->keys())->pluck('name', 'id');

        $rows = $balances->map(fn ($row, $staffId) => [
            'name' => $staff[$staffId] ?? "Staff #{$staffId}",
            'amount' => round((float) $row->balance, 2),
        ])->sortByDesc(fn (array $row) => abs($row['amount']))->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->take(self::MAX_BREAKDOWN_ROWS)->all(),
        ];
    }

    /**
     * Every payment account's balance reconstructed from `account_transactions`
     * as of `end_date`, not the live `accounts.current_balance` — the whole
     * point of this report is a historical cut, not "right now". Business-
     * level, so deliberately not scoped by anything per-branch/location.
     *
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function cashAndBank(Carbon $endDate): array
    {
        $balances = DB::table('account_transactions')
            ->selectRaw('account_id, SUM(amount) as balance')
            ->where('operation_date', '<=', $endDate)
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = Account::query()->orderBy('name')->pluck('name', 'id');

        $rows = $accounts->map(fn (string $name, int $id) => [
            'name' => $name,
            'amount' => round((float) ($balances[$id]->balance ?? 0), 2),
        ])->filter(fn (array $row) => $row['amount'] != 0)->sortByDesc('amount')->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->all(),
        ];
    }

    /**
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function assetBreakdown(Carbon $endDate): array
    {
        return self::ledgerBreakdown('asset_transactions', 'asset_id', Asset::class, $endDate);
    }

    /**
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function investorBreakdown(Carbon $endDate): array
    {
        return self::ledgerBreakdown('investor_transactions', 'investor_id', Investor::class, $endDate);
    }

    /**
     * Loan + accrued interest − repayment, all as one figure — interest
     * accrual is just another signed `loan_transactions` row, so it's
     * already folded in by the plain sum, never broken out separately.
     *
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function companyLoanBreakdown(Carbon $endDate): array
    {
        $balances = DB::table('loan_transactions')
            ->selectRaw('company_loan_id, SUM(amount) as balance')
            ->where('created_at', '<=', $endDate)
            ->groupBy('company_loan_id')
            ->havingRaw('SUM(amount) != 0')
            ->get()
            ->keyBy('company_loan_id');

        if ($balances->isEmpty()) {
            return ['total' => 0.0, 'breakdown' => []];
        }

        $loans = CompanyLoan::query()->whereIn('id', $balances->keys())->pluck('lender_name', 'id');

        $rows = $balances->map(fn ($row, $id) => [
            'name' => $loans[$id] ?? "Loan #{$id}",
            'amount' => round((float) $row->balance, 2),
        ])->sortByDesc('amount')->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->take(self::MAX_BREAKDOWN_ROWS)->all(),
        ];
    }

    /**
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function otherLiabilityBreakdown(Carbon $endDate): array
    {
        return self::ledgerBreakdown('other_liability_transactions', 'other_liability_id', OtherLiability::class, $endDate);
    }

    /**
     * Shared shape for the three `HasLedger` modules whose transaction
     * `amount` is already signed (Asset, Investor, OtherLiability) — Company
     * Loan is the same shape too, but keyed on `lender_name` instead of
     * `name`, so it gets its own tiny method above instead of this one.
     *
     * @param  class-string<Asset|Investor|OtherLiability>  $model
     * @return array{total: float, breakdown: list<array{name: string, amount: float}>}
     */
    private static function ledgerBreakdown(string $table, string $foreignKey, string $model, Carbon $endDate): array
    {
        $balances = DB::table($table)
            ->selectRaw("{$foreignKey} as entity_id, SUM(amount) as balance")
            ->where('created_at', '<=', $endDate)
            ->groupBy($foreignKey)
            ->havingRaw('SUM(amount) != 0')
            ->get()
            ->keyBy('entity_id');

        if ($balances->isEmpty()) {
            return ['total' => 0.0, 'breakdown' => []];
        }

        $names = $model::query()->whereIn('id', $balances->keys())->pluck('name', 'id');

        $rows = $balances->map(fn ($row, $id) => [
            'name' => $names[$id] ?? "#{$id}",
            'amount' => round((float) $row->balance, 2),
        ])->sortByDesc('amount')->values();

        return [
            'total' => round((float) $rows->sum('amount'), 2),
            'breakdown' => $rows->take(self::MAX_BREAKDOWN_ROWS)->all(),
        ];
    }
}
