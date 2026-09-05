<?php

namespace App\Actions\Account;

use App\Enums\AccountTransactionType;
use App\Enums\ChartOfAccountType;
use App\Enums\NormalBalance;
use App\Models\Account;
use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAccountAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, account_type_id: int, account_sub_type?: string|null, account_number?: string|null, opening_balance?: float|string|null}  $data
     */
    public function execute(array $data): Account
    {
        return DB::transaction(function () use ($data) {
            $openingBalance = (float) ($data['opening_balance'] ?? 0);
            $accountType = AccountType::findOrFail($data['account_type_id']);
            $chartOfAccount = $this->createSubAccount($accountType, $data['name']);

            $account = Account::create([
                'name' => $data['name'],
                'account_type_id' => $accountType->id,
                'account_sub_type' => $data['account_sub_type'] ?? null,
                'account_number' => $data['account_number'] ?? null,
                'opening_balance' => $openingBalance,
                'created_by' => Auth::id(),
                'chart_of_account_id' => $chartOfAccount->id,
            ]);

            if ($openingBalance !== 0.0) {
                $this->accounts->record(
                    $account,
                    AccountTransactionType::OpeningBalance,
                    $openingBalance,
                    today(),
                );

                $this->journal->postOpeningBalance(
                    today(),
                    $chartOfAccount,
                    $this->chartOfAccounts->code('3300'),
                    $openingBalance,
                    'account_opening_balance',
                    $account->id,
                    "Opening balance: {$account->name}",
                );
            }

            return $account;
        });
    }

    /**
     * Every Cash/Bank/Mobile Banking/Cheque account gets its own General
     * Ledger sub-account, auto-created under the right parent — Cash-type
     * accounts under 1010, everything else under 1020 — never manually
     * picked by whoever creates the account.
     */
    private function createSubAccount(AccountType $accountType, string $name): ChartOfAccount
    {
        $parent = ChartOfAccount::query()
            ->where('code', $accountType->name === 'Cash' ? '1010' : '1020')
            ->firstOrFail();

        return ChartOfAccount::create([
            'code' => $this->nextSubCode($parent),
            'name' => $name,
            'type' => ChartOfAccountType::Asset,
            'normal_balance' => NormalBalance::Debit,
            'parent_id' => $parent->id,
        ]);
    }

    private function nextSubCode(ChartOfAccount $parent): string
    {
        $lastChildCode = ChartOfAccount::query()
            ->where('parent_id', $parent->id)
            ->orderByDesc('code')
            ->value('code');

        return (string) ((int) ($lastChildCode ?? $parent->code) + 1);
    }
}
