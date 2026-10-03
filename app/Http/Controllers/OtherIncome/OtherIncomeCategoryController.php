<?php

namespace App\Http\Controllers\OtherIncome;

use App\Http\Controllers\Controller;
use App\Http\Requests\OtherIncome\OtherIncomeCategoryRequest;
use App\Models\OtherIncomeCategory;
use Illuminate\Http\RedirectResponse;

/**
 * Categories ("Scrap Sale", "Interest"...) are managed from the Categories tab on the Other
 * Income page, so there is no page of its own.
 */
class OtherIncomeCategoryController extends Controller
{
    public function store(OtherIncomeCategoryRequest $request): RedirectResponse
    {
        OtherIncomeCategory::create($request->validated());

        return back();
    }

    public function update(OtherIncomeCategoryRequest $request, OtherIncomeCategory $category): RedirectResponse
    {
        $category->update($request->validated());

        return back();
    }

    /**
     * A category with income entries is kept, so past rows keep their label.
     */
    public function destroy(OtherIncomeCategory $category): RedirectResponse
    {
        if ($category->incomes()->exists()) {
            return back()->withErrors([
                'category' => 'This category has income entries and cannot be deleted.',
            ]);
        }

        $category->delete();

        return back();
    }
}
