<?php

namespace App\Actions\Sales\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\EmiInstallmentStatus;
use App\Enums\SaleStatus;
use App\Models\Account;
use App\Models\EmiInstallment;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
        return DB::transaction(function () use ($installment, $accountId, $amount) {
            $installment = EmiInstallment::where('id', $installment->id)->lockForUpdate()->firstOrFail();

            if ($installment->status === EmiInstallmentStatus::Paid) {
                throw ValidationException::withMessages([
                    'amount' => ['This installment has already been paid.'],
                ]);
            }

            $remaining = round($installment->amount - $installment->paid_amount, 2);
            if ($remaining <= 0.0) {
                throw ValidationException::withMessages([
                    'amount' => ['This installment has already been fully paid.'],
                ]);
            }

            if ($amount > $remaining + 0.0001) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount cannot exceed the remaining installment due of ৳'.number_format($remaining, 2).'.'],
                ]);
            }

            $sale = $installment->sale()->with('customer')->firstOrFail();

            // Belt-and-suspenders alongside PayEmiInstallmentRequest's own
            // check: a Cancelled sale's remaining installments are voided by
            // CancelSaleAction, but any caller reaching this Action directly
            // (bypassing the request) must be stopped here too — otherwise
            // real money would move against a sale that's already been
            // reversed in full.
            if ($sale->status !== SaleStatus::Confirmed) {
                throw ValidationException::withMessages([
                    'installment' => ['This installment belongs to a sale that is no longer confirmed and can no longer be paid.'],
                ]);
            }

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

            $newPaidAmount = round($installment->paid_amount + $amount, 2);
            $isFullyPaid = $newPaidAmount >= round($installment->amount, 2) - 0.0001;

            $installment->update([
                'paid_amount' => $newPaidAmount,
                'status' => $isFullyPaid ? EmiInstallmentStatus::Paid : $installment->status,
                'paid_at' => now(),
                'account_id' => $accountId,
            ]);

            $sale->recalculatePaymentTotals();

            return $installment->fresh();
        });
    }
}
