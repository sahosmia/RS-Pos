<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\Account\CreateAccountAction;
use App\Actions\Accounting\Account\UpdateAccountAction;
use App\Enums\AccountTransactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\Account\StoreAccountRequest;
use App\Http\Requests\Accounting\Account\UpdateAccountRequest;
use App\Models\Account;
use App\Models\AccountType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    /**
     * List every cash/bank/cheque account with its cached balance.
     */
    public function index(): Response
    {
        $accounts = Account::query()
            ->with('accountType:id,name')
            ->withCount([
                'transactions',
                'transactions as movements_count' => fn (Builder $query) => $query->where('type', '!=', AccountTransactionType::OpeningBalance),
            ])
            ->orderBy('name')
            ->get();

        return Inertia::render('accounting/accounts/index', [
            'accounts' => $accounts->map(fn (Account $account) => [
                'id' => $account->id,
                'name' => $account->name,
                'account_type_id' => $account->account_type_id,
                'account_type' => $account->accountType->only(['id', 'name']),
                'account_sub_type' => $account->account_sub_type,
                'account_number' => $account->account_number,
                'opening_balance' => $account->opening_balance,
                'current_balance' => $account->current_balance,
                'is_active' => $account->is_active,
                'is_default' => $account->is_default,
                'can_delete' => $account->transactions_count === 0,
                'can_edit_opening_balance' => $account->movements_count === 0,
            ]),
            'accountTypes' => AccountType::query()->withCount('accounts')->orderBy('name')->get()
                ->map(fn (AccountType $type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'accounts_count' => $type->accounts_count,
                    'is_protected' => $type->isProtected(),
                    'can_delete' => $type->accounts_count === 0 && ! $type->isProtected(),
                ]),
            'totalBalance' => (float) Account::query()->active()->sum('current_balance'),
        ]);
    }

    public function store(StoreAccountRequest $request, CreateAccountAction $createAccount): RedirectResponse
    {
        $createAccount->execute($request->validated());

        return to_route('accounts.index');
    }

    public function update(UpdateAccountRequest $request, Account $account, UpdateAccountAction $updateAccount): RedirectResponse
    {
        $updateAccount->execute($account, $request->validated());

        return to_route('accounts.index');
    }

    /**
     * Accounts that already carry history are closed, never deleted.
     */
    public function destroy(Account $account): RedirectResponse
    {
        if ($account->transactions()->exists()) {
            return back()->withErrors([
                'account' => 'This account has recorded transactions — mark it inactive instead of deleting it.',
            ]);
        }

        $account->delete();

        return to_route('accounts.index');
    }
}
