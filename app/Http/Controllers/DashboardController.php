<?php

namespace App\Http\Controllers;

use App\Enums\DateRangePreset;
use App\Enums\PurchaseStatus;
use App\Enums\SaleStatus;
use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Settings;
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Quick Actions + date-filtered analytics grid (doc/corrections2.md #4).
 * Quick Actions aren't permission-filtered yet — Role & Permission
 * (Phase 18) is deliberately the very last phase of this project, so
 * every authenticated user is currently an Admin/Owner-equivalent; the
 * fixed action set below is shown to all of them, exactly like every
 * other page in the app today that's guarded by `auth` alone.
 *
 * Receivable/Payable/Cash are Chart-of-Accounts-sourced (1100/2100/
 * 1010+1020), matching the Balance Sheet's own numbers — they're a
 * point-in-time balance, not a period metric, so the date filter
 * deliberately doesn't touch them.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'preset' => ['nullable', Rule::enum(DateRangePreset::class)],
            'from' => ['nullable', 'date', 'required_if:preset,custom'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'required_if:preset,custom'],
        ]);

        $preset = isset($validated['preset']) ? DateRangePreset::from($validated['preset']) : DateRangePreset::Today;

        if ($preset === DateRangePreset::Custom) {
            $from = Carbon::parse($validated['from'])->startOfDay();
            $to = Carbon::parse($validated['to'])->endOfDay();
        } else {
            $range = $preset->resolve();
            $from = $range['start']->copy()->startOfDay();
            $to = $range['end']->copy()->endOfDay();
        }

        $accounts = ChartOfAccount::query()->active()->get();
        $byCode = fn (string $code) => (float) ($accounts->firstWhere('code', $code)->balance ?? 0);
        $cashParentIds = $accounts->whereIn('code', ['1010', '1020'])->pluck('id')->all();
        $cashAndBank = (float) $accounts
            ->filter(fn (ChartOfAccount $a) => in_array($a->code, ['1010', '1020'], true) || in_array($a->parent_id, $cashParentIds, true))
            ->sum('balance');

        $lowStockCount = Product::query()
            ->where('manage_stock', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock_level')
            ->count();

        $confirmedSales = fn () => Sale::query()->where('status', SaleStatus::Confirmed)->whereBetween('sale_date', [$from, $to]);
        $receivedPurchases = fn () => Purchase::query()->where('status', PurchaseStatus::Received)->whereBetween('purchase_date', [$from, $to]);

        $totalSales = (float) $confirmedSales()->sum('total_amount');
        $invoiceDue = (float) $confirmedSales()->sum('due_amount');
        $totalSellReturn = (float) SaleReturn::query()->whereBetween('return_date', [$from, $to])->sum('total_amount');

        $totalPurchase = (float) $receivedPurchases()->sum('total_amount');
        $purchaseDue = (float) $receivedPurchases()->sum('due_amount');
        $totalPurchaseReturn = (float) PurchaseReturn::query()->whereBetween('return_date', [$from, $to])->sum('total_amount');
        $totalExpense = (float) Expense::query()->whereBetween('expense_date', [$from, $to])->sum('total_amount');

        return Inertia::render('dashboard', [
            'salesLast30Days' => $this->salesLast30Days(),
            'salesCurrentFiscalYear' => $this->salesCurrentFiscalYear(),
            'quickActions' => [
                ['label' => __('dashboard.new_sale'), 'href' => route('sales.create')],
                ['label' => __('dashboard.new_purchase'), 'href' => route('purchases.create')],
                ['label' => __('dashboard.collect_due'), 'href' => route('contacts.index', ['type' => 'customer'])],
                ['label' => __('dashboard.pay_due'), 'href' => route('contacts.index', ['type' => 'supplier'])],
                ['label' => __('dashboard.new_expense'), 'href' => route('expenses.index')],
                ['label' => __('dashboard.new_contact'), 'href' => route('contacts.index')],
            ],
            'range' => [
                'preset' => $preset->value,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'metrics' => [
                'totalSales' => round($totalSales, 2),
                'netSales' => round($totalSales - $totalSellReturn, 2),
                'invoiceDue' => round($invoiceDue, 2),
                'totalSellReturn' => round($totalSellReturn, 2),
                'totalPurchase' => round($totalPurchase, 2),
                'purchaseDue' => round($purchaseDue, 2),
                'totalPurchaseReturn' => round($totalPurchaseReturn, 2),
                'totalExpense' => round($totalExpense, 2),
            ],
            'balances' => [
                'totalReceivable' => round($byCode('1100'), 2),
                'totalPayable' => round($byCode('2100'), 2),
                'cashAndBank' => round($cashAndBank, 2),
                'lowStockCount' => $lowStockCount,
            ],
        ]);
    }

    /**
     * One point per calendar day, today back through 29 days ago — always
     * this fixed trailing window, independent of the page's own date-range
     * filter above (which is for the metrics grid, not this chart).
     *
     * @return list<array{date: string, total: float}>
     */
    private function salesLast30Days(): array
    {
        $start = Carbon::today()->subDays(29)->startOfDay();
        $end = Carbon::today()->endOfDay();

        $byDay = Sale::query()
            ->where('status', SaleStatus::Confirmed)
            ->whereBetween('sale_date', [$start, $end])
            ->get(['sale_date', 'total_amount'])
            ->groupBy(fn (Sale $sale) => $sale->sale_date->toDateString());

        return collect(range(29, 0))
            ->map(function (int $daysAgo) use ($byDay) {
                $day = Carbon::today()->subDays($daysAgo);

                return [
                    'date' => $day->toDateString(),
                    'total' => round((float) ($byDay->get($day->toDateString())?->sum('total_amount') ?? 0), 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * One point per month of the shop's current fiscal year (per
     * `Settings::fiscal_year_start_month` — Bangladesh default July–June),
     * not the calendar year — a month with no sales yet (e.g. the rest of
     * the year still ahead) just shows 0 rather than being left out.
     *
     * @return list<array{month: string, label: string, total: float}>
     */
    private function salesCurrentFiscalYear(): array
    {
        $fiscalYear = FiscalYear::current(Settings::current()->fiscal_year_start_month);
        $fyStart = $fiscalYear['start'];

        $byMonth = Sale::query()
            ->where('status', SaleStatus::Confirmed)
            ->whereBetween('sale_date', [$fiscalYear['start'], $fiscalYear['end']])
            ->get(['sale_date', 'total_amount'])
            ->groupBy(fn (Sale $sale) => $sale->sale_date->format('Y-m'));

        return collect(range(0, 11))
            ->map(function (int $i) use ($fyStart, $byMonth) {
                $month = $fyStart->copy()->addMonths($i);
                $key = $month->format('Y-m');

                return [
                    'month' => $key,
                    'label' => $month->format('M Y'),
                    'total' => round((float) ($byMonth->get($key)?->sum('total_amount') ?? 0), 2),
                ];
            })
            ->values()
            ->all();
    }
}
