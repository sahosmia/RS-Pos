<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Models\Sale;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Ledger-level discount — forgives part of what a customer owes (loyalty,
 * goodwill). The discount is taken off the customer's oldest unpaid invoices
 * first, so their due and status follow the ledger; anything beyond their
 * invoices (e.g. an opening balance) comes off the general balance.
 *
 * It posts Dr Sales Returns & Allowances (4150, the contra-income account for
 * price reductions after the sale) / Cr Accounts Receivable, so the General
 * Ledger shrinks with the contact's balance instead of drifting away from it.
 */
class WaiveContactDueAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Contact $contact, float $amount, ?string $note = null): void
    {
        DB::transaction(function () use ($contact, $amount, $note) {
            $remaining = round(abs($amount), 2);

            $sales = Sale::query()->where('customer_id', $contact->id)->allocatableDue()->lockForUpdate()->get();

            foreach ($sales as $sale) {
                if ($remaining <= 0.0) {
                    break;
                }

                $portion = min($remaining, round((float) $sale->due_amount, 2));

                $this->ledger->recordContact($contact, ContactLedgerType::DiscountWaived, -$portion, 'sale', $sale->id, $note);
                $this->postJournal($contact, $portion, 'sale', $sale->id);
                $sale->recalculatePaymentTotals();

                $remaining = round($remaining - $portion, 2);
            }

            if ($remaining > 0.0) {
                $this->ledger->recordContact($contact, ContactLedgerType::DiscountWaived, -$remaining, null, null, $note);
                $this->postJournal($contact, $remaining, 'contact', $contact->id);
            }
        });
    }

    private function postJournal(Contact $contact, float $amount, string $referenceType, int $referenceId): void
    {
        $this->journal->post(today(), "Discount waived: {$contact->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->code('4150')->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->code('1100')->id, 'debit' => 0, 'credit' => $amount],
        ], $referenceType, $referenceId);
    }
}
