<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Shared by Asset, CompanyLoan, Investor, OtherLiability — all four are a
 * header row with a cached running balance plus an immutable transaction
 * log, differing only in which column holds that balance (`current_value`,
 * `outstanding_balance`, `total_invested`, `current_balance`) and what their
 * transaction type enum allows. The subsidiary ledger only: account/journal
 * posting is the caller's job (see each module's Add*TransactionAction),
 * exactly like LedgerService/AccountService stay separate from JournalService.
 *
 * @mixin Model
 */
trait HasLedger
{
    /**
     * The column this model caches its running balance in — differs per
     * model, kept as the design doc named it since later reporting phases
     * reference these exact column names.
     */
    abstract protected function ledgerBalanceColumn(): string;

    /**
     * Record one ledger movement and move the cached balance by the same
     * amount — the only route to either.
     *
     * @return Model The created transaction row — typed loosely since each model's transactions() relation returns a different subclass.
     */
    public function addLedgerTransaction(string $type, float $amount, ?int $accountId = null, ?string $note = null): Model
    {
        $amount = round($amount, 2);

        $transaction = $this->transactions()->create([
            'type' => $type,
            'amount' => $amount,
            'account_id' => $accountId,
            'note' => $note,
            'created_by' => Auth::id(),
        ]);

        $this->increment($this->ledgerBalanceColumn(), $amount);

        return $transaction;
    }

    /**
     * Re-derive the cached balance from the transaction log — the source of
     * truth, never accumulated incrementally once this is called.
     */
    public function recalculateLedgerBalance(): void
    {
        $this->forceFill([
            $this->ledgerBalanceColumn() => round((float) $this->transactions()->sum('amount'), 2),
        ])->save();
    }
}
