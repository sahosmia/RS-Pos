<?php

namespace App\Services;

use App\Enums\AccountTransactionType;
use App\Models\Account;
use App\Models\AccountTransaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The only place an account's cached balance is allowed to move.
 *
 * Every caller records the movement and the balance together, so
 * `accounts.current_balance` always equals the sum of its transactions.
 */
class AccountService
{
    /**
     * Record one money movement against an account.
     *
     * `$amount` is signed: positive is money in, negative is money out.
     * `$operationDate` is the business date every report reads — not the
     * moment the row happened to be entered.
     */
    public function record(
        Account $account,
        AccountTransactionType $type,
        float $amount,
        CarbonInterface $operationDate,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $note = null,
    ): AccountTransaction {
        return DB::transaction(function () use ($account, $type, $amount, $operationDate, $referenceType, $referenceId, $note) {
            $transaction = $account->transactions()->create([
                'type' => $type,
                'amount' => $amount,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'operation_date' => $operationDate,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $account->increment('current_balance', $amount);

            return $transaction;
        });
    }

    /**
     * Split a single payment across several accounts — part cash, part bank.
     * Returns the total amount moved.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function recordSplitPayment(
        array $payments,
        AccountTransactionType $type,
        CarbonInterface $operationDate,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $note = null,
    ): float {
        return DB::transaction(function () use ($payments, $type, $operationDate, $referenceType, $referenceId, $note) {
            $total = 0.0;

            foreach ($payments as $payment) {
                $amount = (float) $payment['amount'];

                $this->record(
                    Account::findOrFail($payment['account_id']),
                    $type,
                    $amount,
                    $operationDate,
                    $referenceType,
                    $referenceId,
                    $note,
                );

                $total += $amount;
            }

            return $total;
        });
    }
}
