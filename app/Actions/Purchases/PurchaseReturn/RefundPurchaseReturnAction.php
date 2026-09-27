<?php

namespace App\Actions\Purchases\PurchaseReturn;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\PurchaseReturn;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
     *
     * @throws ValidationException
     */
    public function execute(PurchaseReturn $return, array $payments): PurchaseReturn
    {
        return DB::transaction(function () use ($return, $payments) {
            // Re-fetch fresh + locked inside the transaction so two concurrent
            // refund submissions can't both read the same refunded_amount and
            // both slip under the cap.
            $return = PurchaseReturn::where('id', $return->id)->lockForUpdate()->firstOrFail();
            $return->loadMissing('supplier');

            $requested = round(array_sum(array_map(fn (array $payment) => abs((float) $payment['amount']), $payments)), 2);
            $remaining = round($return->total_amount - $return->refunded_amount, 2);

            if ($requested - $remaining > 0.0001) {
                throw ValidationException::withMessages([
                    'payments' => ['Already refunded ৳'.number_format($return->refunded_amount, 2).' of ৳'.number_format($return->total_amount, 2).' for this return — ৳'.number_format(max($remaining, 0), 2).' remaining.'],
                ]);
            }

            $refunded = $this->accounts->recordSplitPayment(
                $payments,
                AccountTransactionType::PurchaseReturnRefund,
                today(),
                'purchase_return',
                $return->id,
            );

            $this->ledger->recordContact($return->supplier, ContactLedgerType::PaymentReceived, -$refunded, 'purchase_return', $return->id);

            $this->postJournal($return, $payments);

            $return->increment('refunded_amount', $refunded);

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
