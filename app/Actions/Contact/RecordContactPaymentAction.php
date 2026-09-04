<?php

namespace App\Actions\Contact;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Contact;
use App\Services\AccountService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * "Pay Due Amount" — a standalone ledger-only settlement, separate from any
 * sale/purchase confirm. Touches both Accounts (real cash movement) and the
 * Contact ledger together, in one transaction.
 */
class RecordContactPaymentAction
{
    public function __construct(
        private LedgerService $ledger,
        private AccountService $accounts,
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
        });
    }
}
