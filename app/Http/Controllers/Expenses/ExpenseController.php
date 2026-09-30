<?php

namespace App\Http\Controllers\Expenses;

use App\Actions\Expenses\Expense\AddExpensePaymentAction;
use App\Actions\Expenses\Expense\CreateExpenseAction;
use App\Actions\Expenses\Expense\UpdateExpenseAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\Expense\StoreExpenseRequest;
use App\Http\Requests\Expenses\Expense\UpdateExpenseRequest;
use App\Models\Account;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Settings;
use App\Queries\Expenses\ExpenseQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'expense_category_id' => ['nullable', 'integer', 'exists:expense_categories,id'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $expenses = ExpenseQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $expenses->getCollection()->transform(fn (Expense $expense) => [
            'id' => $expense->id,
            'category' => $expense->category->only(['id', 'name']),
            'contact' => $expense->contact?->only(['id', 'name']),
            'total_amount' => $expense->total_amount,
            'paid_amount' => $expense->paid_amount,
            'due_amount' => $expense->due_amount,
            'payment_status' => $expense->payment_status,
            'expense_date' => $expense->expense_date->toDateString(),
            'created_at' => $expense->created_at?->toIso8601String(),
            'due_date' => $expense->due_date?->toDateString(),
            'note' => $expense->note,
            'can_edit' => $expense->canEdit(),
            'attachment' => $this->attachmentFor($expense),
        ]);

        $statsQuery = ExpenseQuery::filtered($validated);
        $stats = [
            'total_expenses' => (clone $statsQuery)->count(),
            'total_amount' => (float) (clone $statsQuery)->sum('total_amount'),
            'total_paid' => (float) (clone $statsQuery)->sum('paid_amount'),
            'total_due' => (float) (clone $statsQuery)->sum('due_amount'),
        ];

        return Inertia::render('expenses/index', [
            'expenses' => $expenses,
            'stats' => $stats,
            'categories' => ExpenseCategory::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'expense_category_id' => $validated['expense_category_id'] ?? null,
                'payment_status' => $validated['payment_status'] ?? null,
                'sort' => $validated['sort'] ?? 'expense_date',
                'direction' => $validated['direction'] ?? 'desc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function store(StoreExpenseRequest $request, CreateExpenseAction $createExpense, AddExpensePaymentAction $addPayment): RedirectResponse
    {
        $data = $request->validated();
        $expense = $createExpense->execute($data);

        // `CreateExpenseAction` only ever records the accrual (Dr category/Cr
        // Payable) — the form still asks for a single account paid in full
        // immediately, so settle that here as the same separate payment step
        // `AddExpensePaymentAction` already provides for later/partial pays.
        $addPayment->execute($expense, [['account_id' => $data['account_id'], 'amount' => $expense->total_amount]]);

        if ($request->hasFile('attachment')) {
            $expense->addMediaFromRequest('attachment')->toMediaCollection('documents');
        }

        return back();
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        if (! $expense->canEdit()) {
            return back()->withErrors(['expense' => 'This expense already has a payment and cannot be deleted directly.']);
        }

        $expense->delete();

        return back();
    }

    public function update(UpdateExpenseRequest $request, Expense $expense, UpdateExpenseAction $updateExpense): RedirectResponse
    {
        if (! $expense->canEdit()) {
            return back()->withErrors(['expense' => 'This expense already has a payment and can no longer be edited directly.']);
        }

        $updateExpense->execute($expense, $request->validated());

        if ($request->hasFile('attachment')) {
            $expense->addMediaFromRequest('attachment')->toMediaCollection('documents');
        }

        return back();
    }

    /**
     * @return array{url: string, name: string}|null
     */
    private function attachmentFor(Expense $expense): ?array
    {
        $media = $expense->getFirstMedia('documents');

        if ($media === null) {
            return null;
        }

        return ['url' => $media->getUrl(), 'name' => $media->file_name];
    }
}
