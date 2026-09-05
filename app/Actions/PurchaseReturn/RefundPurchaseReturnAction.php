<?php

namespace App\Actions\PurchaseReturn;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\PurchaseReturn;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * "Refund Payment" — separate from creating the return, since a return
 * always reduces what we owe the supplier in full at creation time; this is
 * only reached when the supplier additionally sends cash back for some or
 * all of that credit, any time after the return exists.
 */
class RefundPurchaseReturnAction
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
    public function execute(PurchaseReturn $return, array $payments): PurchaseReturn
    {
        return DB::transaction(function () use ($return, $payments) {
            $return->loadMissing('supplier');

            $refunded = $this->accounts->recordSplitPayment(
                $payments,
                AccountTransactionType::PurchaseReturnRefund,
                today(),
                'purchase_return',
                $return->id,
            );

            $this->ledger->recordContact($return->supplier, ContactLedgerType::PaymentReceived, -$refunded, 'purchase_return', $return->id);

            $this->postJournal($return, $payments);

            return $return->fresh();
        });
    }

    /**
     * One Dr {receiving account} / Cr Accounts Payable pair per account —
     * cash comes in and payable moves back down, since this refund settles
     * part of what the return credited us.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(PurchaseReturn $return, array $payments): void
    {
        $payable = $this->chartOfAccounts->code('2100');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $payable->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(
            today(),
            "Refund for purchase return #{$return->id}",
            $lines,
            'purchase_return_refund',
            $return->id,
        );
    }
}
