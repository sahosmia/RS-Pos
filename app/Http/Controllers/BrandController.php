<?php

namespace App\Http\Controllers;

use App\Http\Requests\Brand\BrandRequest;
use App\Models\Brand;
use Illuminate\Http\RedirectResponse;

class BrandController extends Controller
{
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
