<?php

namespace App\Http\Controllers;

use App\Actions\Product\CreateProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Product list — search, filter (category/brand/stock status), sort, pagination.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'stock_status' => ['nullable', 'in:in_stock,low_stock,out_of_stock'],
            'sort' => ['nullable', 'in:name,selling_price,current_stock'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';

        $products = Product::query()
            ->with(['category:id,name', 'brand:id,name', 'unit:id,name'])
            ->when($validated['search'] ?? null, fn (Builder $query, string $search) => $query->where(function (Builder $query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            }))
            ->when($validated['category_id'] ?? null, fn (Builder $query, int $id) => $query->where('category_id', $id))
            ->when($validated['brand_id'] ?? null, fn (Builder $query, int $id) => $query->where('brand_id', $id))
            ->when($validated['stock_status'] ?? null, function (Builder $query, string $status) {
                match ($status) {
                    'out_of_stock' => $query->where('current_stock', '<=', 0),
                    'low_stock' => $query->where('current_stock', '>', 0)->whereColumn('current_stock', '<=', 'minimum_stock_level'),
                    'in_stock' => $query->whereColumn('current_stock', '>', 'minimum_stock_level'),
                };
            })
            ->orderBy($sort, $direction)
            ->paginate(20)
            ->withQueryString();

        $products->getCollection()->transform(fn (Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'category' => $product->category->only(['id', 'name']),
            'brand' => $product->brand?->only(['id', 'name']),
            'unit' => $product->unit->only(['id', 'name']),
            'avg_cost' => $product->avg_cost,
            'selling_price' => $product->selling_price,
            'current_stock' => $product->current_stock,
            'minimum_stock_level' => $product->minimum_stock_level,
            'stock_status' => $product->stock_status,
            'profit_margin' => $product->profit_margin,
            'manage_stock' => $product->manage_stock,
            'is_for_sale' => $product->is_for_sale,
            'is_active' => $product->is_active,
            'can_set_opening_stock' => $product->canSetOpeningStock(),
            'image_url' => $product->getFirstMediaUrl('images') ?: null,
        ]);

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $validated['search'] ?? null,
                'category_id' => $validated['category_id'] ?? null,
                'brand_id' => $validated['brand_id'] ?? null,
                'stock_status' => $validated['stock_status'] ?? null,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/create', [
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreProductRequest $request, CreateProductAction $createProduct): RedirectResponse
    {
        $product = $createProduct->execute($request->validated());

        if ($request->hasFile('image')) {
            $product->addMediaFromRequest('image')->toMediaCollection('images');
        }

        return to_route('products.index');
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('products/edit', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'category_id' => $product->category_id,
                'brand_id' => $product->brand_id,
                'unit_id' => $product->unit_id,
                'selling_price' => $product->selling_price,
                'minimum_stock_level' => $product->minimum_stock_level,
                'manage_stock' => $product->manage_stock,
                'is_for_sale' => $product->is_for_sale,
                'is_active' => $product->is_active,
                'warranty_period_months' => $product->warranty_period_months,
                'has_installation_service' => $product->has_installation_service,
                'emi_available' => $product->emi_available,
                'track_serial_number' => $product->track_serial_number,
                'current_stock' => $product->current_stock,
                'can_set_opening_stock' => $product->canSetOpeningStock(),
                'image_url' => $product->getFirstMediaUrl('images') ?: null,
            ],
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product, UpdateProductAction $updateProduct): RedirectResponse
    {
        $updateProduct->execute($product, $request->validated());

        if ($request->hasFile('image')) {
            $product->addMediaFromRequest('image')->toMediaCollection('images');
        }

        return to_route('products.index');
    }

    /**
     * Products that already carry stock history are deactivated, never deleted.
     */
    public function destroy(Product $product): RedirectResponse
    {
        if ($product->stockMovements()->exists()) {
            return back()->withErrors([
                'product' => 'This product has stock movements — mark it inactive instead of deleting it.',
            ]);
        }

        $product->delete();

        return to_route('products.index');
    }
}
