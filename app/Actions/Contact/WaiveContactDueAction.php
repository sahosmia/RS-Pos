<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Services\LedgerService;

/**
 * Ledger-level discount — forgives part of what a contact owes, unrelated
 * to any specific sale (loyalty, goodwill). A negative amount reduces
 * receivable (or grows payable), the mirror of every other "reduction"
 * ledger type.
 */
class WaiveContactDueAction
{
    public function __construct(private LedgerService $ledger) {}

    public function execute(Contact $contact, float $amount, ?string $note = null): void
    {
        $this->ledger->recordContact($contact, ContactLedgerType::DiscountWaived, -abs($amount), null, null, $note);
    }
}
