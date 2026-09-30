<?php

namespace App\Actions\Contact;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Contact;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Hands a customer's credit back as cash — the money they paid in advance, or
 * over what they owed, that is sitting on the ledger as a negative balance.
 * Moves the paying account down, the customer's balance back toward zero,
 * and posts Dr Accounts Receivable / Cr {paying account}, the exact mirror of
 * the overpayment that created the credit, so Receivable nets out instead of
 * carrying a credit balance forever.
 */
class RefundContactCreditAction
{
    public function __construct(
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @throws ValidationException When the amount is more than the customer's credit.
     */
    public function execute(Contact $contact, Account $account, float $amount, ?string $note = null): void
    {
        DB::transaction(function () use ($contact, $account, $amount, $note) {
            $amount = round($amount, 2);
            $contact = Contact::query()->lockForUpdate()->findOrFail($contact->id);
            $credit = max(0.0, round(-(float) $contact->balance, 2));

            if ($amount > $credit + 0.0001) {
                throw ValidationException::withMessages([
                    'amount' => [$credit > 0
                        ? 'A refund cannot exceed the customer\'s credit of ৳'.number_format($credit, 2).'.'
                        : 'This customer has no credit to refund.'],
                ]);
            }

            $note ??= 'Refund';

            $this->accounts->record($account, AccountTransactionType::CustomerRefund, -$amount, today(), 'contact', $contact->id, $note);
            $this->ledger->recordContact($contact, ContactLedgerType::PaymentMade, $amount, 'account', $account->id, $note);

            $this->journal->post(today(), "Refund to customer {$contact->name}", [
                ['chart_of_account_id' => $this->chartOfAccounts->code('1100')->id, 'debit' => $amount, 'credit' => 0],
                ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
            ], 'contact', $contact->id);
        });
    }
}
