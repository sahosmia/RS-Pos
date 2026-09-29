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

        // `select()` (not `selectRaw()`, which only appends) so this replaces the
        // `has_stock_movements` exists-select ProductQuery::filtered() adds for the list
        // view — otherwise it lingers alongside these aggregates with no GROUP BY (MySQL 1140).
        $rawStats = ProductQuery::filtered($filters)
            ->reorder()
            ->toBase()
            ->select(DB::raw('
                COUNT(*) as total_products,
                COALESCE(SUM(CASE WHEN manage_stock = 1 THEN current_stock ELSE 0 END), 0) as total_stock,
                COALESCE(SUM(CASE WHEN manage_stock = 1 THEN current_stock * avg_cost ELSE 0 END), 0) as total_stock_value,
                COUNT(CASE WHEN manage_stock = 1 AND current_stock <= minimum_stock_level THEN 1 END) as low_stock_count
            '))
            ->first();

        $stats = [
            'total_products' => (int) ($rawStats->total_products ?? 0),
            'total_stock' => (float) ($rawStats->total_stock ?? 0),
            'total_stock_value' => (float) ($rawStats->total_stock_value ?? 0),
            'low_stock_count' => (int) ($rawStats->low_stock_count ?? 0),
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
