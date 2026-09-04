<?php

namespace App\Actions\Account;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Services\AccountService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAccountAction
{
    public function __construct(private AccountService $accounts) {}

    /**
     * @param  array{name: string, account_type_id: int, account_sub_type?: string|null, account_number?: string|null, opening_balance?: float|string|null}  $data
     */
    public function execute(array $data): Account
    {
        return DB::transaction(function () use ($data) {
            $openingBalance = (float) ($data['opening_balance'] ?? 0);

            $account = Account::create([
                'name' => $data['name'],
                'account_type_id' => $data['account_type_id'],
                'account_sub_type' => $data['account_sub_type'] ?? null,
                'account_number' => $data['account_number'] ?? null,
                'opening_balance' => $openingBalance,
                'created_by' => Auth::id(),
            ]);

            if ($openingBalance !== 0.0) {
                $this->accounts->record(
                    $account,
                    AccountTransactionType::OpeningBalance,
                    $openingBalance,
                    today(),
                );
            }

            return $account;
        });
    }
}
