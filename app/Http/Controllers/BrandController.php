<?php

namespace App\Http\Controllers;

use App\Http\Requests\Brand\BrandRequest;
use App\Models\Brand;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    public function index(): Response
    {
        $brands = Brand::query()->withCount('products')->orderBy('name')->get();

        return Inertia::render('brands/index', [
            'brands' => $brands->map(fn (Brand $brand) => [
                'id' => $brand->id,
                'name' => $brand->name,
                'products_count' => $brand->products_count,
                'can_delete' => $brand->products_count === 0,
            ]),
        ]);
    }

    public function store(BrandRequest $request): RedirectResponse
    {
        Brand::create($request->validated());

        return back();
    }

    public function update(BrandRequest $request, Brand $brand): RedirectResponse
    {
        $brand->update($request->validated());

        return back();
    }

    /**
     * Brands already used by a product are kept.
     */
    public function destroy(Brand $brand): RedirectResponse
    {
        if ($brand->products()->exists()) {
            return back()->withErrors([
                'brand' => 'This brand is in use by a product and cannot be deleted.',
            ]);
        }

        $brand->delete();

        return back();
    }
}
