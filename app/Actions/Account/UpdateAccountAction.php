<?php

namespace App\Actions\Account;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Services\AccountService;
use Illuminate\Support\Facades\DB;

class UpdateAccountAction
{
    public function __construct(private AccountService $accounts) {}

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
        }
    }
}
