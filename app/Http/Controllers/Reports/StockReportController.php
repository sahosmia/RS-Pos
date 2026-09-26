<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Current stock list — operational (পর্ব ১৪), reads Product directly
 * rather than the Inventory (1200) GL balance, since this needs a
 * per-product breakdown the Chart of Accounts doesn't carry.
 */
class StockReportController extends Controller
{
    public function __invoke(): Response
    {
        $products = Product::query()
            ->where('manage_stock', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'current_stock', 'avg_cost', 'minimum_stock_level']);

        $rows = $products->map(fn (Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'current_stock' => $product->current_stock,
            'avg_cost' => $product->avg_cost,
            'stock_value' => round($product->current_stock * $product->avg_cost, 2),
            'stock_status' => $product->stock_status,
        ]);

        return Inertia::render('reports/stock-report', [
            'rows' => $rows,
            'totalValue' => round((float) $rows->sum('stock_value'), 2),
            'lowStockCount' => $rows->where('stock_status', 'low_stock')->count() + $rows->where('stock_status', 'out_of_stock')->count(),
        ]);
    }
}
