<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Models\Purchase;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Discount a supplier gives us on what we owe them — the mirror of WaiveContactDueAction. No cash moves: the payable
 * simply shrinks. It comes off the supplier's oldest unpaid purchases first (or one specific purchase), and anything
 * beyond their purchases (e.g. an opening balance) comes off the general balance.
 *
 * Posts Dr Accounts Payable (2100) / Cr Other Income (4400), so the General Ledger shrinks with the contact's balance.
 */
class ReceiveContactDiscountAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    public function execute(Contact $contact, float $amount, ?string $note = null, ?int $purchaseId = null): void
    {
        DB::transaction(function () use ($contact, $amount, $note, $purchaseId) {
            $remaining = round(abs($amount), 2);

            $purchases = Purchase::query()
                ->where('supplier_id', $contact->id)
                ->when($purchaseId, fn ($query) => $query->where('id', $purchaseId))
                ->allocatableDue()
                ->lockForUpdate()
                ->get();

            foreach ($purchases as $purchase) {
                if ($remaining <= 0.0) {
                    break;
                }

                $portion = min($remaining, round((float) $purchase->due_amount, 2));

                $this->ledger->recordContact($contact, ContactLedgerType::DiscountReceived, $portion, 'purchase', $purchase->id, $note);
                $this->postJournal($contact, $portion, 'purchase', $purchase->id);
                $purchase->recalculatePaymentTotals();

                $remaining = round($remaining - $portion, 2);
            }

            if ($remaining > 0.0 && $purchaseId === null) {
                $this->ledger->recordContact($contact, ContactLedgerType::DiscountReceived, $remaining, null, null, $note);
                $this->postJournal($contact, $remaining, 'contact', $contact->id);
            }
        });
    }

    private function postJournal(Contact $contact, float $amount, string $referenceType, int $referenceId): void
    {
        $this->journal->post(today(), "Discount received: {$contact->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->code('2100')->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->code('4400')->id, 'debit' => 0, 'credit' => $amount],
        ], $referenceType, $referenceId);
    }
}
