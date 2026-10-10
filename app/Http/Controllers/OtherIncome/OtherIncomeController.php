<?php

namespace App\Http\Controllers\OtherIncome;

use App\Actions\OtherIncome\CreateOtherIncomeAction;
use App\Actions\OtherIncome\DeleteOtherIncomeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Common\BulkDestroyRequest;
use App\Http\Requests\OtherIncome\StoreOtherIncomeRequest;
use App\Models\Account;
use App\Models\OtherIncome;
use App\Models\OtherIncomeCategory;
use App\Models\Settings;
use App\Queries\OtherIncome\OtherIncomeQuery;
use App\Support\BulkDelete;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OtherIncomeController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:other_income_categories,id'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $incomes = OtherIncomeQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $incomes->getCollection()->transform(fn (OtherIncome $income) => [
            'id' => $income->id,
            'category' => $income->category->only(['id', 'name']),
            'account' => $income->account->only(['id', 'name']),
            'amount' => $income->amount,
            'income_date' => $income->income_date->toDateString(),
            'note' => $income->note,
            'added_by' => $income->creator?->name,
        ]);

        return Inertia::render('other-income/index', [
            'incomes' => $incomes,
            'totalIncome' => (float) OtherIncomeQuery::filtered($validated)->reorder()->sum('amount'),
            'categories' => OtherIncomeCategory::query()
                ->withCount('incomes')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (OtherIncomeCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'incomes_count' => $category->incomes_count,
                    'can_delete' => $category->incomes_count === 0,
                ]),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'filters' => [
                'category_id' => $validated['category_id'] ?? null,
                'sort' => $validated['sort'] ?? 'income_date',
                'direction' => $validated['direction'] ?? 'desc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function store(StoreOtherIncomeRequest $request, CreateOtherIncomeAction $createIncome): RedirectResponse
    {
        $createIncome->execute($request->validated());

        return back();
    }

    public function destroy(OtherIncome $otherIncome, DeleteOtherIncomeAction $deleteIncome): RedirectResponse
    {
        $deleteIncome->execute($otherIncome);

        return back();
    }

    /**
     * "Delete selected" — each record is checked by the same rule as the single delete.
     */
    public function bulkDestroy(BulkDestroyRequest $request, DeleteOtherIncomeAction $deleteIncome): RedirectResponse
    {
        return BulkDelete::respond(BulkDelete::run(
            $request->validated('ids'),
            OtherIncome::query()->whereIn('id', $request->validated('ids'))->get(),
            fn (OtherIncome $income) => null,
            fn (OtherIncome $income) => $deleteIncome->execute($income),
        ));
    }
}
