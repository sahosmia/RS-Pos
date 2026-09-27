<?php

namespace App\Http\Controllers\Products;

use App\Actions\Products\Product\CreateProductAction;
use App\Actions\Products\Product\DeleteProductAction;
use App\Actions\Products\Product\UpdateProductAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\Product\ProductIndexRequest;
use App\Http\Requests\Products\Product\StoreProductRequest;
use App\Http\Requests\Products\Product\UpdateProductRequest;
use App\Http\Resources\Product\ProductFormResource;
use App\Http\Resources\Product\ProductListResource;
use App\Models\Product;
use App\Models\Settings;
use App\Queries\Product\ProductFormOptions;
use App\Queries\Product\ProductQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(ProductIndexRequest $request): Response
    {
        $filters = $request->validated();
        $query = ProductQuery::filtered($filters);

        $resolvedPerPage = Settings::resolveRequestedPerPage($filters['per_page'] ?? null);

        $products = $query->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)->withQueryString();

        $products = $products->through(fn (Product $product) => ProductListResource::make($product)->resolve());

        $statsQuery = ProductQuery::filtered($filters);
        $stats = [
            'total_products' => (clone $statsQuery)->count(),
            'total_stock' => (float) (clone $statsQuery)->where('manage_stock', true)->sum('current_stock'),
            // `->selectRaw(...)->value(...)` doesn't go through Eloquent's aggregate()
            // machinery, so it can't reset the base query's `withExists` select or
            // `orderBy` — mixing that leftover non-aggregated select with a raw SUM
            // and no GROUP BY is what MySQL error 1140 was coming from. `->sum()`
            // (like `total_stock` above) goes through the real aggregate path, which
            // clears both automatically, and already coalesces a null sum to 0.
            'total_stock_value' => (float) (clone $statsQuery)->where('manage_stock', true)->sum(DB::raw('current_stock * avg_cost')),
            'low_stock_count' => (clone $statsQuery)->where('manage_stock', true)->whereColumn('current_stock', '<=', 'minimum_stock_level')->count(),
        ];

        return Inertia::render('products/index', [
            'products' => $products,
            'stats' => $stats,
            ...ProductFormOptions::forIndex(),
            'filters' => [
                ...$filters,
                'sort' => $filters['sort'] ?? 'name',
                'direction' => $filters['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/create', ProductFormOptions::forIndex());
    }

    public function store(StoreProductRequest $request, CreateProductAction $createProduct): RedirectResponse
    {
        $createProduct->execute($request->validated(), $request->file('image'));

        return to_route('products.index');
    }

    public function show(Product $product): Response
    {
        $product->load(['category', 'brand', 'unit']);

        $movements = $product->stockMovements()
            ->latest('id')
            ->paginate(20)
            ->through(fn ($movement) => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'type_label' => match ($movement->type->value) {
                    'opening_stock' => 'Opening Stock',
                    'purchase' => 'Purchase',
                    'sale' => 'Sale',
                    'sale_return' => 'Sale Return',
                    'purchase_return' => 'Purchase Return',
                    'adjustment_increase' => 'Adjustment (Increase)',
                    'adjustment_decrease' => 'Adjustment (Decrease)',
                    default => $movement->type->value,
                },
                'is_increase' => $movement->type->increasesStock(),
                'quantity' => $movement->quantity,
                'unit_cost' => $movement->unit_cost,
                'total_cost' => $movement->total_cost,
                'reference_type' => $movement->reference_type,
                'reference_id' => $movement->reference_id,
                'note' => $movement->note,
                'created_at' => $movement->created_at->toDateTimeString(),
            ]);

        return Inertia::render('products/show', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category?->only(['id', 'name']),
                'brand' => $product->brand?->only(['id', 'name']),
                'unit' => $product->unit->only(['id', 'name']),
                'avg_cost' => $product->avg_cost,
                'selling_price' => $product->selling_price,
                'current_stock' => $product->current_stock,
                'minimum_stock_level' => $product->minimum_stock_level,
                'stock_status' => $product->stock_status,
                'profit_margin' => $product->profit_margin,
                'manage_stock' => $product->manage_stock,
                'warranty_period_months' => $product->warranty_period_months,
                'has_installation_service' => $product->has_installation_service,
                'track_serial_number' => $product->track_serial_number,
                'is_for_sale' => $product->is_for_sale,
                'is_active' => $product->is_active,
                'image_url' => $product->getFirstMediaUrl('images') ?: null,
            ],
            'movements' => $movements,
        ]);
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('products/edit', [
            'product' => ProductFormResource::make($product)->resolve(),
            ...ProductFormOptions::forIndex(),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product, UpdateProductAction $updateProduct): RedirectResponse
    {
        $updateProduct->execute($product, $request->validated(), $request->file('image'));

        return to_route('products.index');
    }

    public function destroy(Product $product, DeleteProductAction $deleteProduct): RedirectResponse
    {
        if ($blockedBy = $deleteProduct->blockingReason($product)) {
            return back()->withErrors(['product' => $blockedBy]);
        }

        $deleteProduct->execute($product);

        return to_route('products.index');
    }
}
