<?php

namespace App\Actions\Sales\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\EmiInstallmentStatus;
use App\Models\Account;
use App\Models\EmiInstallment;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Settles one EMI installment — same GL shape as AddSalePaymentAction (Dr
 * {account} / Cr Accounts Receivable), posted under the parent sale's
 * `reference_type`/`reference_id` so `Sale::recalculatePaymentTotals()`
 * picks it up automatically alongside any other payment on the sale.
 */
class PayEmiInstallmentAction
{
    public function __construct(
        private AccountService $accounts,
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(EmiInstallment $installment, int|string $accountId, float $amount): EmiInstallment
    {
        if ($installment->status === EmiInstallmentStatus::Paid) {
            return $installment;
        }

        return DB::transaction(function () use ($installment, $accountId, $amount) {
            $sale = $installment->sale()->with('customer')->firstOrFail();
            $account = Account::findOrFail($accountId);

            $this->accounts->record($account, AccountTransactionType::EmiPayment, $amount, today(), 'sale', $sale->id);

            $this->ledger->recordContact($sale->customer, ContactLedgerType::PaymentReceived, -$amount, 'sale', $sale->id);

            $receivable = $this->chartOfAccounts->code('1100');
            $this->journal->post(
                today(),
                "EMI installment #{$installment->installment_number} for sale {$sale->invoice_no}",
                [
                    ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
                    ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $amount],
                ],
                'sale',
                $sale->id,
            );

            $installment->update([
                'paid_amount' => $amount,
                'status' => EmiInstallmentStatus::Paid,
                'paid_at' => now(),
                'account_id' => $accountId,
            ]);

            $sale->recalculatePaymentTotals();

            return $installment->fresh();
        });
    }
}
