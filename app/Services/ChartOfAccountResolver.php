<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;

/**
 * Looks up well-known Chart of Accounts rows by their fixed seeded code, and
 * maps a cash/bank Account (Phase 2) to the General Ledger account it posts
 * against — Cash in Hand (1010) or Bank Accounts (1020), keyed off the
 * Account's type name rather than a per-account link, since no per-bank
 * sub-account is created for individual accounts.
 */
class ChartOfAccountResolver
{
    public function code(string $code): ChartOfAccount
    {
        return ChartOfAccount::query()->where('code', $code)->firstOrFail();
    }

    public function forAccount(Account $account): ChartOfAccount
    {
        $account->loadMissing('accountType');

        return $this->code($account->accountType->name === 'Cash' ? '1010' : '1020');
    }
}
