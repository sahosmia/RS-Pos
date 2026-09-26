<?php

namespace App\Http\Controllers\Reports;

use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Settings;
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Best-selling products by quantity/revenue over a period (পর্ব ১৪),
 * aggregated from `sale_items` — only Confirmed sales count (a Draft/
 * Quotation/Cancelled sale never moved stock or revenue).
 */
class TrendingProductsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $default = FiscalYear::current(Settings::current()->fiscal_year_start_month);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($validated['from'] ?? $default['start']);
        $to = Carbon::parse($validated['to'] ?? $default['end']);

        // withSum's correlated subquery can't feed a HAVING clause on MySQL
        // ("HAVING clause on a non-aggregate query" — there's no GROUP BY,
        // it's a per-row subquery, not a true aggregate), so the zero-sold
        // filter, sort, and top-50 cut all happen in PHP instead.
        $rows = Product::query()
            ->withSum(['saleItems as quantity_sold' => function ($query) use ($from, $to) {
                $query->whereHas('sale', fn ($q) => $q->where('status', SaleStatus::Confirmed)->whereBetween('sale_date', [$from, $to]));
            }], 'quantity')
            ->withSum(['saleItems as revenue' => function ($query) use ($from, $to) {
                $query->whereHas('sale', fn ($q) => $q->where('status', SaleStatus::Confirmed)->whereBetween('sale_date', [$from, $to]));
            }], 'subtotal')
            ->get(['id', 'name', 'sku'])
            ->filter(fn (Product $product) => (float) $product->quantity_sold > 0)
            ->sortByDesc(fn (Product $product) => (float) $product->quantity_sold)
            ->take(50)
            ->values()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'quantity_sold' => (float) $product->quantity_sold,
                'revenue' => round((float) $product->revenue, 2),
            ]);

        return Inertia::render('reports/trending-products', [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'rows' => $rows,
        ]);
    }
}
