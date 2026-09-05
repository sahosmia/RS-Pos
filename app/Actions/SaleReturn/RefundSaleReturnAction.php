<?php

namespace App\Actions\SaleReturn;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\SaleReturn;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * "Refund Payment" — separate from creating the return, since a return
 * always reduces the customer's due in full at creation time; this is only
 * reached when the shop additionally hands back cash for some or all of
 * that credit, any time after the return exists.
 */
class RefundSaleReturnAction
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
    public function execute(SaleReturn $return, array $payments): SaleReturn
    {
        return DB::transaction(function () use ($return, $payments) {
            $return->loadMissing('customer');

            $negatedPayments = array_map(fn (array $payment) => [
                'account_id' => $payment['account_id'],
                'amount' => -abs((float) $payment['amount']),
            ], $payments);

            $refunded = abs($this->accounts->recordSplitPayment(
                $negatedPayments,
                AccountTransactionType::SaleReturnRefund,
                today(),
                'sale_return',
                $return->id,
            ));

            $this->ledger->recordContact($return->customer, ContactLedgerType::PaymentMade, $refunded, 'sale_return', $return->id);

            $this->postJournal($return, $payments);

            return $return->fresh();
        });
    }

    /**
     * One Dr Accounts Receivable / Cr {paying account} pair per account —
     * the mirror of how a payment collected against a due posts Dr
     * {account} / Cr AR; here cash leaves and AR moves back up by the same
     * amount, since this refund settles part of what the return credited.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(SaleReturn $return, array $payments): void
    {
        $receivable = $this->chartOfAccounts->code('1100');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $receivable->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(
            today(),
            "Refund for sale return #{$return->id}",
            $lines,
            'sale_return_refund',
            $return->id,
        );
    }
}
