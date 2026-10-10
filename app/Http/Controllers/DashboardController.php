<?php

namespace App\Http\Controllers;

use App\Console\Commands\CheckReconciliation;
use App\Enums\ContactType;
use App\Enums\DateRangePreset;
use App\Enums\PurchaseStatus;
use App\Enums\SaleStatus;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Settings;
use App\Queries\Dashboard\FollowUps;
use App\Queries\Dashboard\OpenSalesOrders;
use App\Support\FiscalYear;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Quick Actions + date-filtered analytics grid.
 */
class DashboardController extends Controller
{
    /**
     * Allowed values for the best-sellers/recent-purchases widget's own
     * `period` filter — a narrow subset of {@see DateRangePreset} (that one
     * also has "This Month", "Custom", etc., which don't make sense as a
     * quick tab switch on a small dashboard widget).
     */
    private const BEST_SELLERS_PERIODS = ['today', 'yesterday', 'last_7_days', 'last_30_days'];

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'preset' => ['nullable', Rule::enum(DateRangePreset::class)],
            'from' => ['nullable', 'date', 'required_if:preset,custom'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'required_if:preset,custom'],
            'period' => ['nullable', Rule::in(self::BEST_SELLERS_PERIODS)],
        ]);

        $preset = isset($validated['preset']) ? DateRangePreset::from($validated['preset']) : DateRangePreset::Today;

        $period = $validated['period'] ?? DateRangePreset::Today->value;
        $periodPreset = DateRangePreset::from($period);
        $periodRange = $periodPreset->resolve();
        $periodFrom = $periodRange['start']->copy()->startOfDay();
        $periodTo = $periodRange['end']->copy()->endOfDay();

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

        $lowStockProducts = Product::query()
            ->where('manage_stock', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock_level')
            ->orderBy('current_stock', 'asc')
            ->take(5)
            ->get(['id', 'name', 'sku', 'current_stock', 'minimum_stock_level'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'current_stock' => (float) $p->current_stock,
                'minimum_stock_level' => (float) $p->minimum_stock_level,
            ]);

        $lowStockCount = Product::query()
            ->where('manage_stock', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock_level')
            ->count();

        $closingStockValue = (float) Product::query()
            ->where('manage_stock', true)
            ->selectRaw('SUM(current_stock * avg_cost) as total_value')
            ->value('total_value') ?? 0.0;

        $totalCustomers = Contact::query()->whereIn('type', [ContactType::Customer, ContactType::Both])->count();
        $totalSuppliers = Contact::query()->whereIn('type', [ContactType::Supplier, ContactType::Both])->count();

        $confirmedSales = fn () => Sale::query()->where('status', SaleStatus::Confirmed)->whereBetween('sale_date', [$from, $to]);
        $receivedPurchases = fn () => Purchase::query()->where('status', PurchaseStatus::Received)->whereBetween('purchase_date', [$from, $to]);

        $totalSales = (float) $confirmedSales()->sum('total_amount');
        $invoiceDue = (float) $confirmedSales()->sum('due_amount');
        $totalSellReturn = (float) SaleReturn::query()->whereBetween('return_date', [$from, $to])->sum('total_amount');

        $totalPurchase = (float) $receivedPurchases()->sum('total_amount');
        $purchaseDue = (float) $receivedPurchases()->sum('due_amount');
        $totalPurchaseReturn = (float) PurchaseReturn::query()->whereBetween('return_date', [$from, $to])->sum('total_amount');
        $totalExpense = (float) Expense::query()->whereBetween('expense_date', [$from, $to])->sum('total_amount');

        $recentSales = Sale::query()
            ->with('customer:id,name')
            ->latest('sale_date')
            ->latest('id')
            ->take(5)
            ->get()
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'invoice_no' => $s->invoice_no,
                'party_name' => $s->customer?->name ?? 'Walk-in Customer',
                'amount' => (float) $s->total_amount,
                'status' => $s->status->value,
                'date' => $s->sale_date->toDateString(),
                'href' => route('sales.show', $s->id),
            ]);

        $recentPurchases = Purchase::query()
            ->with('supplier:id,name')
            ->whereBetween('purchase_date', [$periodFrom, $periodTo])
            ->latest('purchase_date')
            ->latest('id')
            ->take(5)
            ->get()
            ->map(fn (Purchase $p) => [
                'id' => $p->id,
                'invoice_no' => $p->purchase_no,
                'party_name' => $p->supplier?->name ?? 'N/A',
                'amount' => (float) $p->total_amount,
                'status' => $p->status->value,
                'date' => $p->purchase_date->toDateString(),
                'href' => route('purchases.show', $p->id),
            ]);

        $recentExpenses = Expense::query()
            ->with('category:id,name')
            ->latest('expense_date')
            ->latest('id')
            ->take(5)
            ->get()
            ->map(fn (Expense $e) => [
                'id' => $e->id,
                'invoice_no' => $e->expense_no,
                'party_name' => $e->category?->name ?? 'General',
                'amount' => (float) $e->total_amount,
                'status' => 'completed',
                'date' => $e->expense_date->toDateString(),
                'href' => route('expenses.index'),
            ]);

        $bestSellers = SaleItem::query()
            ->whereHas('sale', fn ($q) => $q->where('status', SaleStatus::Confirmed)->whereBetween('sale_date', [$periodFrom, $periodTo]))
            ->with('product:id,name,sku')
            ->selectRaw('product_id, SUM(quantity) as total_qty, SUM(subtotal) as total_amount')
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->take(5)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->product_id,
                'name' => $item->product?->name ?? 'Unknown',
                'sku' => $item->product?->sku ?? '',
                'quantity' => (float) $item->total_qty,
                'total_amount' => (float) $item->total_amount,
            ]);

        // Shop-wide money figures (sales, purchases, expenses, cash and bank, what is owed) are for people who may read
        // reports. A cashier still gets the low-stock list, their follow-ups and the shortcuts, but not the shop's totals.
        $showFigures = (bool) $request->user()?->can('report.view');

        return Inertia::render('dashboard', [
            'showFigures' => $showFigures,
            'salesLast30Days' => $showFigures ? $this->salesLast30Days() : [],
            'salesCurrentFiscalYear' => $showFigures ? $this->salesCurrentFiscalYear() : [],
            'monthlyRevenueVsExpense' => $showFigures ? $this->monthlyRevenueVsExpense() : [],
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
            'bestSellersPeriod' => $period,
            'metrics' => ! $showFigures ? null : [
                'totalSales' => round($totalSales, 2),
                'netSales' => round($totalSales - $totalSellReturn, 2),
                'invoiceDue' => round($invoiceDue, 2),
                'totalSellReturn' => round($totalSellReturn, 2),
                'totalPurchase' => round($totalPurchase, 2),
                'purchaseDue' => round($purchaseDue, 2),
                'totalPurchaseReturn' => round($totalPurchaseReturn, 2),
                'totalExpense' => round($totalExpense, 2),
            ],
            'balances' => ! $showFigures ? null : [
                'totalReceivable' => round($byCode('1100'), 2),
                'totalPayable' => round($byCode('2100'), 2),
                'cashAndBank' => round($cashAndBank, 2),
                'lowStockCount' => $lowStockCount,
                'closingStockValue' => round($closingStockValue, 2),
                'totalCustomers' => $totalCustomers,
                'totalSuppliers' => $totalSuppliers,
            ],
            'lowStockProducts' => $lowStockProducts,
            // Sales data only for someone who may open sales (the lists link to the invoices).
            'followUps' => $request->user()?->canAny(['sale.view_all', 'sale.view_own'])
                ? FollowUps::get((bool) Settings::currentOrNull()?->emi_module_enabled)
                : null,
            // Orders booked but not yet confirmed — null (no card) when there are none.
            'salesOrders' => $request->user()?->canAny(['sale.view_all', 'sale.view_own']) ? OpenSalesOrders::get() : null,
            // The nightly books check's verdict; only people who may read reports see it.
            'booksCheck' => $request->user()?->can('report.view') ? Cache::get(CheckReconciliation::LAST_RUN_CACHE_KEY) : null,
            'recentTransactions' => $showFigures
                ? ['sales' => $recentSales, 'purchases' => $recentPurchases, 'expenses' => $recentExpenses]
                : ['sales' => [], 'purchases' => [], 'expenses' => []],
            'bestSellers' => $showFigures ? $bestSellers : [],
        ]);
    }

    /**
     * One point per calendar day, today back through 29 days ago.
     *
     * @return list<array{date: string, total: float}>
     */
    private function salesLast30Days(): array
    {
        $byDay = $this->dailyTotals(
            Sale::query()
                ->where('status', SaleStatus::Confirmed)
                ->whereBetween('sale_date', [Carbon::today()->subDays(29)->startOfDay(), Carbon::today()->endOfDay()]),
            'sale_date',
        );

        return collect(range(29, 0))
            ->map(function (int $daysAgo) use ($byDay) {
                $day = Carbon::today()->subDays($daysAgo)->toDateString();

                return ['date' => $day, 'total' => round($byDay[$day] ?? 0.0, 2)];
            })
            ->values()
            ->all();
    }

    /**
     * One point per month of the shop's current fiscal year.
     *
     * @return list<array{month: string, label: string, total: float}>
     */
    private function salesCurrentFiscalYear(): array
    {
        $fiscalYear = FiscalYear::current(Settings::current()->fiscal_year_start_month);
        $fyStart = $fiscalYear['start'];

        $byMonth = $this->monthlyTotals(
            Sale::query()
                ->where('status', SaleStatus::Confirmed)
                ->whereBetween('sale_date', [$fiscalYear['start'], $fiscalYear['end']]),
            'sale_date',
        );

        return collect(range(0, 11))
            ->map(function (int $i) use ($fyStart, $byMonth) {
                $month = $fyStart->copy()->addMonths($i);
                $key = $month->format('Y-m');

                return ['month' => $key, 'label' => $month->format('M Y'), 'total' => round($byMonth[$key] ?? 0.0, 2)];
            })
            ->values()
            ->all();
    }

    /**
     * One point per month of the shop's current fiscal year, revenue
     * (confirmed sales) alongside expense — same fiscal-year window as
     * {@see salesCurrentFiscalYear()}, just with a second series.
     *
     * @return list<array{month: string, label: string, revenue: float, expense: float}>
     */
    private function monthlyRevenueVsExpense(): array
    {
        $fiscalYear = FiscalYear::current(Settings::current()->fiscal_year_start_month);
        $fyStart = $fiscalYear['start'];

        $revenueByMonth = $this->monthlyTotals(
            Sale::query()
                ->where('status', SaleStatus::Confirmed)
                ->whereBetween('sale_date', [$fiscalYear['start'], $fiscalYear['end']]),
            'sale_date',
        );

        $expenseByMonth = $this->monthlyTotals(
            Expense::query()->whereBetween('expense_date', [$fiscalYear['start'], $fiscalYear['end']]),
            'expense_date',
        );

        return collect(range(0, 11))
            ->map(function (int $i) use ($fyStart, $revenueByMonth, $expenseByMonth) {
                $month = $fyStart->copy()->addMonths($i);
                $key = $month->format('Y-m');

                return [
                    'month' => $key,
                    'label' => $month->format('M Y'),
                    'revenue' => round($revenueByMonth[$key] ?? 0.0, 2),
                    'expense' => round($expenseByMonth[$key] ?? 0.0, 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Sum of total_amount per calendar day, computed by the database (at most one row per day in
     * the range) instead of loading every sale/expense as a model just to add them up in PHP.
     *
     * @param  Builder<Model>  $query
     * @return array<string, float> keyed Y-m-d
     */
    private function dailyTotals($query, string $dateColumn): array
    {
        $totals = [];

        foreach ($query->toBase()->selectRaw("{$dateColumn} as day, SUM(total_amount) as total")->groupBy($dateColumn)->get() as $row) {
            $day = substr((string) $row->day, 0, 10);
            $totals[$day] = ($totals[$day] ?? 0.0) + (float) $row->total;
        }

        return $totals;
    }

    /**
     * Same, rolled up to months.
     *
     * @param  Builder<Model>  $query
     * @return array<string, float> keyed Y-m
     */
    private function monthlyTotals($query, string $dateColumn): array
    {
        $totals = [];

        foreach ($this->dailyTotals($query, $dateColumn) as $day => $total) {
            $month = substr($day, 0, 7);
            $totals[$month] = ($totals[$month] ?? 0.0) + $total;
        }

        return $totals;
    }
}
