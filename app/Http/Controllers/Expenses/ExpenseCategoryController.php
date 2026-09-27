<?php

namespace App\Http\Controllers\Expenses;

use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\ExpenseCategory\ExpenseCategoryRequest;
use App\Models\ExpenseCategory;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseCategoryController extends Controller
{
    public function index(): Response
    {
        $categories = ExpenseCategory::query()
            ->select(['id', 'name', 'parent_id'])
            ->withCount(['expenses', 'children'])
            ->with('parent:id,name')
            ->orderBy('name')
            ->get();

        return Inertia::render('expense-categories/index', [
            'categories' => $categories->map(fn (ExpenseCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'parent_id' => $category->parent_id,
                'parent' => $category->parent?->only(['id', 'name']),
                'expenses_count' => $category->expenses_count,
                'can_delete' => $category->expenses_count === 0 && $category->children_count === 0,
            ]),
            'allCategories' => $categories->map->only(['id', 'name', 'parent_id']),
        ]);
    }

    public function store(ExpenseCategoryRequest $request, CreateExpenseCategoryAction $createCategory): RedirectResponse
    {
        $createCategory->execute($request->validated());

        return back();
    }

    public function update(ExpenseCategoryRequest $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        $expenseCategory->update($request->validated());

        return back();
    }

    /**
     * Categories already used by an expense, or with sub-categories, are
     * kept — the linked chart_of_accounts sub-account stays too (never
     * orphaned).
     */
    public function destroy(ExpenseCategory $expenseCategory): RedirectResponse
    {
        if ($expenseCategory->expenses()->exists() || $expenseCategory->children()->exists()) {
            return back()->withErrors([
                'expense_category' => 'This category is in use by an expense or sub-category and cannot be deleted.',
            ]);
        }

        $expenseCategory->delete();

        return back();
    }
}
