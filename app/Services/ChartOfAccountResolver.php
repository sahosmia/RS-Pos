<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;

/**
 * Looks up well-known Chart of Accounts rows by their fixed seeded code, and
 * maps a cash/bank Account (Phase 2) to the General Ledger sub-account it
 * posts against — the one CreateAccountAction auto-created and linked via
 * accounts.chart_of_account_id.
 */
class ChartOfAccountResolver
{
    public function code(string $code): ChartOfAccount
    {
        return ChartOfAccount::query()->where('code', $code)->firstOrFail();
    }

    public function forAccount(Account $account): ChartOfAccount
    {
        return $account->loadMissing('chartOfAccount')->chartOfAccount;
    }
}
