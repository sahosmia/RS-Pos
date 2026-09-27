<?php

namespace App\Http\Controllers;

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
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        $lowStockCount = Product::query()
            ->where('manage_stock', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock_level')
            ->count();

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

        return Inertia::render('dashboard', [
            'salesLast30Days' => $this->salesLast30Days(),
            'salesCurrentFiscalYear' => $this->salesCurrentFiscalYear(),
            'monthlyRevenueVsExpense' => $this->monthlyRevenueVsExpense(),
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
                'totalCustomers' => $totalCustomers,
                'totalSuppliers' => $totalSuppliers,
            ],
            'recentTransactions' => [
                'sales' => $recentSales,
                'purchases' => $recentPurchases,
                'expenses' => $recentExpenses,
            ],
            'bestSellers' => $bestSellers,
        ]);
    }

    /**
     * One point per calendar day, today back through 29 days ago.
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
     * One point per month of the shop's current fiscal year.
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

        $revenueByMonth = Sale::query()
            ->where('status', SaleStatus::Confirmed)
            ->whereBetween('sale_date', [$fiscalYear['start'], $fiscalYear['end']])
            ->get(['sale_date', 'total_amount'])
            ->groupBy(fn (Sale $sale) => $sale->sale_date->format('Y-m'));

        $expenseByMonth = Expense::query()
            ->whereBetween('expense_date', [$fiscalYear['start'], $fiscalYear['end']])
            ->get(['expense_date', 'total_amount'])
            ->groupBy(fn (Expense $expense) => $expense->expense_date->format('Y-m'));

        return collect(range(0, 11))
            ->map(function (int $i) use ($fyStart, $revenueByMonth, $expenseByMonth) {
                $month = $fyStart->copy()->addMonths($i);
                $key = $month->format('Y-m');

                return [
                    'month' => $key,
                    'label' => $month->format('M Y'),
                    'revenue' => round((float) ($revenueByMonth->get($key)?->sum('total_amount') ?? 0), 2),
                    'expense' => round((float) ($expenseByMonth->get($key)?->sum('total_amount') ?? 0), 2),
                ];
            })
            ->values()
            ->all();
    }
}
