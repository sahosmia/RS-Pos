<?php

namespace App\Actions\Account;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;

class UpdateAccountAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, account_type_id: int, account_sub_type?: string|null, account_number?: string|null, opening_balance?: float|string|null, is_active?: bool}  $data
     */
    public function execute(Account $account, array $data): Account
    {
        return DB::transaction(function () use ($account, $data) {
            $canEditOpeningBalance = $account->canEditOpeningBalance();
            $openingBalance = (float) ($data['opening_balance'] ?? $account->opening_balance);

            $account->update([
                'name' => $data['name'],
                'account_type_id' => $data['account_type_id'],
                'account_sub_type' => $data['account_sub_type'] ?? null,
                'account_number' => $data['account_number'] ?? null,
                'is_active' => $data['is_active'] ?? $account->is_active,
                'opening_balance' => $canEditOpeningBalance ? $openingBalance : $account->opening_balance,
            ]);

            if ($canEditOpeningBalance) {
                $this->syncOpeningTransaction($account, $openingBalance);
            }

            return $account;
        });
    }

    /**
     * Correct the opening entry itself. Only reachable while the account has
     * no other movement, so the balance can safely follow the difference.
     */
    private function syncOpeningTransaction(Account $account, float $openingBalance): void
    {
        $opening = $account->openingTransaction();

        if ($opening === null) {
            if ($openingBalance !== 0.0) {
                $this->accounts->record($account, AccountTransactionType::OpeningBalance, $openingBalance, today());
                $this->postOpeningBalanceJournal($account, $openingBalance);
            }

            return;
        }

        $delta = $openingBalance - $opening->amount;

        if ($openingBalance === 0.0) {
            $opening->delete();
        } else {
            $opening->update(['amount' => $openingBalance]);
        }

        if ($delta !== 0.0) {
            $account->increment('current_balance', $delta);
            $this->syncOpeningBalanceJournal($account, $openingBalance);
        }
    }

    /**
     * The journal entry is never edited — the amount changed, so the
     * original (if any) is reversed and a fresh one posted for the new
     * amount, keeping the General Ledger append-only even though the
     * subsidiary account_transactions row above is corrected in place
     * (only reachable pre-any-other-activity, where that's accepted).
     */
    private function syncOpeningBalanceJournal(Account $account, float $newAmount): void
    {
        $original = JournalEntry::query()
            ->where('reference_type', 'account_opening_balance')
            ->where('reference_id', $account->id)
            ->where('status', 'posted')
            ->first();

        if ($original !== null) {
            $this->journal->reverse($original, 'Opening balance corrected');
        }

        if ($newAmount !== 0.0) {
            $this->postOpeningBalanceJournal($account, $newAmount);
        }
    }

    private function postOpeningBalanceJournal(Account $account, float $amount): void
    {
        $this->journal->postOpeningBalance(
            today(),
            $account->chartOfAccount,
            $this->chartOfAccounts->code('3300'),
            $amount,
            'account_opening_balance',
            $account->id,
            "Opening balance: {$account->name}",
        );
    }
}
