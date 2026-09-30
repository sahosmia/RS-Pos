<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\AccountType\AccountTypeRequest;
use App\Models\AccountType;
use Illuminate\Http\RedirectResponse;

class AccountTypeController extends Controller
{
    public function store(AccountTypeRequest $request): RedirectResponse
    {
        AccountType::create($request->validated());

        return to_route('accounts.index', ['tab' => 'types']);
    }

    public function update(AccountTypeRequest $request, AccountType $accountType): RedirectResponse
    {
        $accountType->update($request->validated());

        return to_route('accounts.index', ['tab' => 'types']);
    }

    /**
     * Types already used by an account are kept, and so is the built-in Cash
     * type (the ledger routes cash accounts by its name).
     */
    public function destroy(AccountType $accountType): RedirectResponse
    {
        if ($accountType->isProtected()) {
            return back()->withErrors([
                'account_type' => "The \"{$accountType->name}\" type is built in and cannot be deleted.",
            ]);
        }

        if ($accountType->accounts()->exists()) {
            return back()->withErrors([
                'account_type' => 'This type is in use by an account and cannot be deleted.',
            ]);
        }

        $accountType->delete();

        return to_route('accounts.index', ['tab' => 'types']);
    }
}
