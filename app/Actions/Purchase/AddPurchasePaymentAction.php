<?php

namespace App\Actions\Purchase;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Purchase;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
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
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
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

                $this->postJournal($purchase, $payments);
            }

            $creditApplied = round($creditApplied, 2);

            if ($creditApplied > 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::CreditApplied, -$creditApplied, 'purchase', $purchase->id);
            }

            $purchase->recalculatePaymentTotals();

            return $purchase->fresh();
        });
    }

    /**
     * One Dr Accounts Payable / Cr {paying account} line pair per account —
     * same shape as the payment lines ConfirmPurchaseAction posts at
     * confirm time, just posted separately since this happens later.
     * Credit applied needs no line — it nets against Payable's existing
     * balance without a cash movement, same as at confirm time.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(Purchase $purchase, array $payments): void
    {
        $payable = $this->chartOfAccounts->code('2100');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $payable->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(today(), "Payment for purchase {$purchase->invoice_no}", $lines, 'purchase', $purchase->id);
    }
}
