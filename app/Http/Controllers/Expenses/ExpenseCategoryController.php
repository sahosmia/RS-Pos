<?php

namespace App\Http\Controllers\Expenses;

use App\Actions\Expenses\ExpenseCategory\CreateExpenseCategoryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\ExpenseCategory\ExpenseCategoryRequest;
use App\Models\ExpenseCategory;
use Illuminate\Http\RedirectResponse;

class ExpenseCategoryController extends Controller
{
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
     * Categories already used by an expense are kept — the linked
     * chart_of_accounts sub-account stays too (never orphaned).
     */
    public function destroy(ExpenseCategory $expenseCategory): RedirectResponse
    {
        if ($expenseCategory->expenses()->exists()) {
            return back()->withErrors([
                'expense_category' => 'This category is in use by an expense and cannot be deleted.',
            ]);
        }

        $expenseCategory->delete();

        return back();
    }
}
