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

/**
 * "Pay Due Amount" — a standalone ledger-only settlement, separate from any
 * sale/purchase confirm, used only for a genuine general-balance settlement
 * (not tied to a specific sale/purchase — those go through
 * AddSalePaymentAction/AddPurchasePaymentAction instead so their due amounts
 * stay correct). Touches Accounts (real cash movement), the Contact ledger,
 * and the General Ledger together, in one transaction.
 */
class RecordContactPaymentAction
{
    public function __construct(
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * `$direction` is 'received' (they pay us — receivable shrinks) or
     * 'made' (we pay them — payable shrinks).
     */
    public function execute(
        Contact $contact,
        Account $account,
        float $amount,
        string $direction,
        ?string $note = null,
    ): void {
        DB::transaction(function () use ($contact, $account, $amount, $direction, $note) {
            if ($direction === 'received') {
                $this->accounts->record($account, AccountTransactionType::SalePayment, $amount, today(), 'contact', $contact->id, $note);
                $this->ledger->recordContact($contact, ContactLedgerType::PaymentReceived, -$amount, 'account', $account->id, $note);
            } else {
                $this->accounts->record($account, AccountTransactionType::PurchasePayment, -$amount, today(), 'contact', $contact->id, $note);
                $this->ledger->recordContact($contact, ContactLedgerType::PaymentMade, $amount, 'account', $account->id, $note);
            }

            $this->postJournal($contact, $account, $amount, $direction);
        });
    }

    /**
     * One Dr/Cr line pair between the paying account and Accounts
     * Receivable (received) / Accounts Payable (made) — same shape as
     * AddSalePaymentAction/AddPurchasePaymentAction's private postJournal(),
     * just against the contact's running balance instead of one sale/
     * purchase, since this settlement isn't tied to either.
     */
    private function postJournal(Contact $contact, Account $account, float $amount, string $direction): void
    {
        $amount = round($amount, 2);
        $accountLine = $this->chartOfAccounts->forAccount($account)->id;

        if ($direction === 'received') {
            $receivable = $this->chartOfAccounts->code('1100');
            $lines = [
                ['chart_of_account_id' => $accountLine, 'debit' => $amount, 'credit' => 0],
                ['chart_of_account_id' => $receivable->id, 'debit' => 0, 'credit' => $amount],
            ];
        } else {
            $payable = $this->chartOfAccounts->code('2100');
            $lines = [
                ['chart_of_account_id' => $payable->id, 'debit' => $amount, 'credit' => 0],
                ['chart_of_account_id' => $accountLine, 'debit' => 0, 'credit' => $amount],
            ];
        }

        $this->journal->post(today(), "Payment for contact {$contact->name}", $lines, 'contact', $contact->id);
    }
}
