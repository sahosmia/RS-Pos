<?php

namespace App\Http\Controllers;

use App\Http\Requests\Category\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;

class CategoryController extends Controller
{
    public function store(CategoryRequest $request): RedirectResponse
    {
        Category::create($request->validated());

        return back();
    }

    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

        return back();
    }

    /**
     * Categories already used by a product, or with sub-categories, are kept.
     */
    public function destroy(Category $category): RedirectResponse
    {
        if ($category->products()->exists() || $category->children()->exists()) {
            return back()->withErrors([
                'category' => 'This category is in use by a product or sub-category and cannot be deleted.',
            ]);
        }

        $category->delete();

        return back();
    }
}
