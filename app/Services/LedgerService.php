<?php

namespace App\Services;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Models\ContactLedger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The only place a contact's cached balance is allowed to move.
 *
 * Every caller records the ledger entry and the balance together, so
 * `contacts.balance` always equals the sum of its ledger entries.
 */
class LedgerService
{
    /**
     * Record one balance movement against a contact.
     *
     * `$amount` is signed per the sign convention (পর্ব ০.৩): positive
     * grows what they owe us (receivable), negative grows what we owe
     * them (payable) — the caller decides the sign for its own context.
     */
    public function recordContact(
        Contact $contact,
        ContactLedgerType $type,
        float $amount,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $note = null,
    ): ContactLedger {
        return DB::transaction(function () use ($contact, $type, $amount, $referenceType, $referenceId, $note) {
            $entry = $contact->ledgerEntries()->create([
                'type' => $type,
                'amount' => $amount,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $contact->increment('balance', $amount);

            return $entry;
        });
    }
}
