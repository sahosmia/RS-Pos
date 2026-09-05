<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChartOfAccount\ChartOfAccountRequest;
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
        $accounts = ChartOfAccount::query()->withCount('lines')->with('parent:id,name')->orderBy('code')->get();

        return Inertia::render('chart-of-accounts/index', [
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
                'can_delete' => $account->lines_count === 0 && ! $account->children()->exists(),
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
        if ($chartOfAccount->lines()->exists() || $chartOfAccount->children()->exists()) {
            return back()->withErrors([
                'chart_of_account' => 'This account has journal entries or sub-accounts and cannot be deleted.',
            ]);
        }

        $chartOfAccount->delete();

        return back();
    }
}
