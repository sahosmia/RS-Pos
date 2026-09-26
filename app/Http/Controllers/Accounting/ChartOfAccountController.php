<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\ChartOfAccount\ChartOfAccountRequest;
use App\Models\ChartOfAccount;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ChartOfAccountController extends Controller
{
    /**
     * Tree view — every account, ordered so parents lead their children.
     */
    public function index(): Response
    {
        $accounts = ChartOfAccount::query()->withCount(['lines', 'children'])->with('parent:id,name')->orderBy('code')->get();

        return Inertia::render('accounting/chart-of-accounts/index', [
            'accounts' => $accounts->map(fn (ChartOfAccount $account) => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'normal_balance' => $account->normal_balance,
                'parent_id' => $account->parent_id,
                'parent' => $account->parent?->only(['id', 'name']),
                'balance' => $account->balance,
                'is_active' => $account->is_active,
                'can_delete' => $account->lines_count === 0 && $account->children_count === 0,
            ]),
            'allAccounts' => $accounts->map->only(['id', 'code', 'name', 'parent_id']),
        ]);
    }

    public function store(ChartOfAccountRequest $request): RedirectResponse
    {
        ChartOfAccount::create($request->validated());

        return back();
    }

    public function update(ChartOfAccountRequest $request, ChartOfAccount $chartOfAccount): RedirectResponse
    {
        $chartOfAccount->update($request->validated());

        return back();
    }

    /**
     * Accounts already posted to, or with sub-accounts, are kept — the
     * General Ledger's history is immutable.
     */
    public function destroy(ChartOfAccount $chartOfAccount): RedirectResponse
    {
        $blockedBy = match (true) {
            $chartOfAccount->lines()->exists() => 'This account has journal entries and cannot be deleted.',
            $chartOfAccount->children()->exists() => 'This account has sub-accounts and cannot be deleted.',
            $chartOfAccount->accounts()->exists() => 'A cash/bank account is linked to this chart of account and cannot be deleted.',
            $chartOfAccount->expenseCategories()->exists() => 'An expense category is linked to this chart of account and cannot be deleted.',
            default => null,
        };

        if ($blockedBy !== null) {
            return back()->withErrors(['chart_of_account' => $blockedBy]);
        }

        $chartOfAccount->delete();

        return back();
    }
}
