<?php

namespace App\Http\Controllers\Reports;

use App\Enums\ChartOfAccountType;
use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Both the day-to-day Quick Balance Sheet and the full double-entry
 * Financial Position (পর্ব ১৪/৩৫) now source from the same place: Chart of
 * Accounts cached balances, never `accounts.current_balance`/
 * `contacts.balance`/`other_liabilities.current_balance`/etc. directly —
 * those remain fast operational subsidiary ledgers, not this report's
 * source of truth. Since Income/Expense accounts are never "closed" into
 * Retained Earnings, Net Profit (all-time, income minus expense) is added
 * as the balancing figure on the Equity side — the standard double-entry
 * treatment for an always-open book.
 */
class BalanceSheetController extends Controller
{
    public function __invoke(): Response
    {
        $accounts = ChartOfAccount::query()
            ->where(fn ($q) => $q->where('is_active', true)->orWhere('balance', '!=', 0))
            ->get();

        $byCode = fn (string $code) => (float) ($accounts->firstWhere('code', $code)->balance ?? 0);

        // Every real payment Account (Cash/Bank/Mobile/Cheque) posts against
        // an auto-created child of 1010 or 1020, not those parents directly
        // (পর্ব ৬), so "cash position" is the whole subtree's balance.
        $cashParentIds = $accounts->whereIn('code', ['1010', '1020'])->pluck('id')->all();
        $cashAndBank = (float) $accounts
            ->filter(fn (ChartOfAccount $a) => in_array($a->code, ['1010', '1020'], true) || in_array($a->parent_id, $cashParentIds, true))
            ->sum('balance');

        $netProfit = round(
            (float) $accounts->where('type', ChartOfAccountType::Income)->sum('balance')
            - (float) $accounts->where('type', ChartOfAccountType::Expense)->sum('balance'),
            2,
        );

        $assetsTotal = round((float) $accounts->where('type', ChartOfAccountType::Asset)->sum('balance'), 2);
        $liabilitiesTotal = round((float) $accounts->where('type', ChartOfAccountType::Liability)->sum('balance'), 2);
        $equityTotal = round((float) $accounts->where('type', ChartOfAccountType::Equity)->sum('balance'), 2);

        return Inertia::render('reports/balance-sheet', [
            'quick' => [
                'receivable' => $byCode('1100'),
                'payable' => $byCode('2100'),
                'inventory' => $byCode('1200'),
                'cashAndBank' => $cashAndBank,
            ],
            'full' => [
                'assets' => $accounts->where('type', ChartOfAccountType::Asset)->values()->map(fn (ChartOfAccount $a) => $a->only(['id', 'code', 'name', 'balance']))->all(),
                'liabilities' => $accounts->where('type', ChartOfAccountType::Liability)->values()->map(fn (ChartOfAccount $a) => $a->only(['id', 'code', 'name', 'balance']))->all(),
                'equity' => $accounts->where('type', ChartOfAccountType::Equity)->values()->map(fn (ChartOfAccount $a) => $a->only(['id', 'code', 'name', 'balance']))->all(),
                'netProfit' => $netProfit,
                'assetsTotal' => $assetsTotal,
                'liabilitiesAndEquityTotal' => round($liabilitiesTotal + $equityTotal + $netProfit, 2),
            ],
        ]);
    }
}
