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
            'total_stock_value' => (float) ((clone $statsQuery)->where('manage_stock', true)->selectRaw('COALESCE(SUM(current_stock * avg_cost), 0) as aggregate')->value('aggregate') ?? 0.0),
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
