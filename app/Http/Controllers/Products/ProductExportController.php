<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Settings;
use App\Queries\Product\ProductQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ProductExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'name' => 'Name',
        'sku' => 'SKU',
        'barcode' => 'Barcode',
        'category' => 'Category',
        'brand' => 'Brand',
        'stock' => 'Stock',
        'pap' => 'Purchase Average Price (P.A.P)',
        'tpp' => 'Total Purchase Price (T.P.P)',
        'price' => 'Price',
        'margin' => 'Margin %',
        'status' => 'Status',
    ];

    /**
     * @var array<string, string>
     */
    private const STOCK_STATUS_LABELS = [
        'in_stock' => 'In Stock',
        'low_stock' => 'Low Stock',
        'out_of_stock' => 'Out of Stock',
    ];

    /**
     * Exports the same rows the Products Datatable's "Export" dialog offered —
     * same filters as the index page, plus a row scope (this page/all/selected)
     * and a column subset chosen in that dialog.
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'format' => ['required', 'in:csv,xlsx,pdf'],
            'scope' => ['required', 'in:page,all,selected'],
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(array_keys(self::COLUMN_LABELS))],
            'ids' => ['required_if:scope,selected', 'array'],
            'ids.*' => ['integer'],
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'stock_status' => ['nullable', 'in:in_stock,low_stock,out_of_stock'],
            'sort' => ['nullable', 'in:name,selling_price,current_stock,avg_cost'],
            'direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = ProductQuery::filtered($validated);

        $products = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $products->map(fn (Product $product) => array_map(
            fn (string $id) => $this->cell($product, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'products', 'Products', $headings, $rows);
    }

    /**
     * @param  Builder<Product>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Product>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Product $product, string $column): string|int|float|null
    {
        return match ($column) {
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'category' => $product->category?->name,
            'brand' => $product->brand?->name,
            'stock' => $product->manage_stock ? "{$product->current_stock} {$product->unit->name}" : '—',
            'pap' => $product->avg_cost,
            'tpp' => $product->manage_stock ? round($product->avg_cost * $product->current_stock, 2) : '—',
            'price' => $product->selling_price,
            'margin' => $product->profit_margin,
            'status' => $product->manage_stock ? self::STOCK_STATUS_LABELS[$product->stock_status] : 'Service Item',
        };
    }
}
