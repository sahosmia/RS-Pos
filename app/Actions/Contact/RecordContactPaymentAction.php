<?php

namespace App\Actions\Contact;

use App\Actions\Purchases\Purchase\AddPurchasePaymentAction;
use App\Actions\Sales\Sale\AddSalePaymentAction;
use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Purchase;
use App\Models\Sale;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * "Pay Due Amount" — a settlement against a contact's balance that isn't aimed
 * at one specific sale/purchase (those go through
 * AddSalePaymentAction/AddPurchasePaymentAction directly). The money is first
 * applied to the contact's oldest unpaid invoices through those same actions,
 * so every invoice's paid/due/status stays in step with the ledger; only what
 * is left after every invoice is settled is recorded as a general balance
 * movement (an advance/credit, or the contact's opening balance). Touches
 * Accounts (real cash movement), the Contact ledger, and the General Ledger
 * together, in one transaction.
 */
class RecordContactPaymentAction
{
    public function __construct(
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
        private AddSalePaymentAction $addSalePayment,
        private AddPurchasePaymentAction $addPurchasePayment,
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
            $remaining = $direction === 'received'
                ? $this->applyToSales($contact, $account, round($amount, 2))
                : $this->applyToPurchases($contact, $account, round($amount, 2));

            if ($remaining <= 0.0) {
                return;
            }

            if ($direction === 'received') {
                $this->accounts->record($account, AccountTransactionType::SalePayment, $remaining, today(), 'contact', $contact->id, $note);
                $this->ledger->recordContact($contact, ContactLedgerType::PaymentReceived, -$remaining, 'account', $account->id, $note);
            } else {
                $this->accounts->record($account, AccountTransactionType::PurchasePayment, -$remaining, today(), 'contact', $contact->id, $note);
                $this->ledger->recordContact($contact, ContactLedgerType::PaymentMade, $remaining, 'account', $account->id, $note);
            }

            $this->postJournal($contact, $account, $remaining, $direction);
        });
    }

    /**
     * @return float What is left after the customer's oldest due invoices are settled.
     */
    private function applyToSales(Contact $contact, Account $account, float $remaining): float
    {
        $sales = Sale::query()->where('customer_id', $contact->id)->allocatableDue()->lockForUpdate()->get();

        foreach ($sales as $sale) {
            if ($remaining <= 0.0) {
                break;
            }

            $portion = min($remaining, round((float) $sale->due_amount, 2));
            $this->addSalePayment->execute($sale, [['account_id' => $account->id, 'amount' => $portion]]);
            $remaining = round($remaining - $portion, 2);
        }

        return $remaining;
    }

    /**
     * @return float What is left after the supplier's oldest due purchases are settled.
     */
    private function applyToPurchases(Contact $contact, Account $account, float $remaining): float
    {
        $purchases = Purchase::query()->where('supplier_id', $contact->id)->allocatableDue()->lockForUpdate()->get();

        foreach ($purchases as $purchase) {
            if ($remaining <= 0.0) {
                break;
            }

            $portion = min($remaining, round((float) $purchase->due_amount, 2));
            $this->addPurchasePayment->execute($purchase, [['account_id' => $account->id, 'amount' => $portion]]);
            $remaining = round($remaining - $portion, 2);
        }

        return $remaining;
    }

    /**
     * One Dr/Cr line pair between the paying account and Accounts
     * Receivable (received) / Accounts Payable (made) — same shape as
     * AddSalePaymentAction/AddPurchasePaymentAction's private postJournal(),
     * just against the contact's running balance instead of one sale/
     * purchase, since this part of the settlement isn't tied to either.
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
