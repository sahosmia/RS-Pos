<?php

namespace App\Actions\Sales\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Sale;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Settles more of an already-Confirmed sale's due — separate from
 * confirming it, no stock effect.
 */
class AddSalePaymentAction
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
    public function execute(Sale $sale, array $payments): Sale
    {
        return DB::transaction(function () use ($sale, $payments) {
            // Two payments submitted together must not both pass the "within the due" check made before the lock.
            Sale::query()->whereKey($sale->id)->lockForUpdate()->first();
            $sale->refresh();

            $requested = round(array_sum(array_map(fn (array $payment) => (float) $payment['amount'], $payments)), 2);

            if ($requested > round((float) $sale->due_amount, 2) + 0.0001) {
                throw ValidationException::withMessages(['payments' => ['Payment amount cannot exceed the remaining due amount of ৳'.number_format((float) $sale->due_amount, 2).'.']]);
            }

            $sale->loadMissing('customer');

            $paidViaAccounts = $this->accounts->recordSplitPayment(
                $payments,
                AccountTransactionType::SalePayment,
                today(),
                'sale',
                $sale->id,
            );

            $this->ledger->recordContact($sale->customer, ContactLedgerType::PaymentReceived, -$paidViaAccounts, 'sale', $sale->id);

            $this->postJournal($sale, $payments);

            $sale->recalculatePaymentTotals();

            return $sale->fresh();
        });
    }

    /**
     * One Dr {paying account} / Cr Accounts Receivable line pair per
     * account — same shape as the payment lines ConfirmSaleAction posts at
     * confirm time, just posted separately since this happens later.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(Sale $sale, array $payments): void
    {
        $receivable = $this->chartOfAccounts->code('1100');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(today(), "Payment for sale {$sale->invoice_no}", $lines, 'sale', $sale->id);
    }
}
