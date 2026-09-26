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

    /**
     * The next sequential sub-account code under a parent (e.g. 1010's
     * first child is 1011) — shared by every "auto-create a sub-account
     * for this new row" flow (Account → 1010/1020, ExpenseCategory → 5200).
     */
    public function nextChildCode(ChartOfAccount $parent): string
    {
        $lastChildCode = ChartOfAccount::query()
            ->where('parent_id', $parent->id)
            ->orderByDesc('code')
            ->value('code');

        return (string) ((int) ($lastChildCode ?? $parent->code) + 1);
    }
}
