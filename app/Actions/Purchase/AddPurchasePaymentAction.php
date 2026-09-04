<?php

namespace App\Actions\Purchase;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Purchase;
use App\Services\AccountService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

/**
 * Settles more of an already-Received purchase's due — separate from
 * ConfirmPurchaseAction, no stock effect. Supports paying via one or more
 * accounts and/or applying the supplier's existing credit balance.
 */
class AddPurchasePaymentAction
{
    public function __construct(
        private AccountService $accounts,
        private LedgerService $ledger,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function execute(Purchase $purchase, array $payments = [], float $creditApplied = 0.0): Purchase
    {
        return DB::transaction(function () use ($purchase, $payments, $creditApplied) {
            $purchase->loadMissing('supplier');

            if ($payments !== []) {
                $negatedPayments = array_map(fn (array $payment) => [
                    'account_id' => $payment['account_id'],
                    'amount' => -abs((float) $payment['amount']),
                ], $payments);

                $paidViaAccounts = abs($this->accounts->recordSplitPayment(
                    $negatedPayments,
                    AccountTransactionType::PurchasePayment,
                    Date::today(),
                    'purchase',
                    $purchase->id,
                ));

                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::PaymentMade, $paidViaAccounts, 'purchase', $purchase->id);
            }

            $creditApplied = round($creditApplied, 2);

            if ($creditApplied > 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::CreditApplied, -$creditApplied, 'purchase', $purchase->id);
            }

            $purchase->recalculatePaymentTotals();

            return $purchase->fresh();
        });
    }
}
