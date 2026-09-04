<?php

namespace App\Http\Controllers;

use App\Http\Requests\Category\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        $categories = Category::query()->withCount('products')->with('parent:id,name')->orderBy('name')->get();

        return Inertia::render('categories/index', [
            'categories' => $categories->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'parent_id' => $category->parent_id,
                'parent' => $category->parent?->only(['id', 'name']),
                'products_count' => $category->products_count,
                'can_delete' => $category->products_count === 0 && ! $category->children()->exists(),
            ]),
            'allCategories' => $categories->map->only(['id', 'name', 'parent_id']),
        ]);
    }

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
