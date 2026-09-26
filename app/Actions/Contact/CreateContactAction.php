<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateContactAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, prefix?: string|null, first_name?: string|null, middle_name?: string|null, last_name?: string|null, contact_code?: string|null, phone: string, phone_alternate?: string|null, email?: string|null, address?: string|null, shipping_address?: string|null, reference?: string|null, type: string, entity_type?: string, business_name?: string|null, customer_group_id?: int|null, is_active?: bool, opening_balance?: float|string|null}  $data
     */
    public function execute(array $data): Contact
    {
        return DB::transaction(function () use ($data) {
            $contact = Contact::create([
                'name' => $data['name'],
                'prefix' => $data['prefix'] ?? null,
                'first_name' => $data['first_name'] ?? null,
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'contact_code' => $data['contact_code'] ?? null,
                'phone' => $data['phone'],
                'phone_alternate' => $data['phone_alternate'] ?? null,
                'email' => $data['email'] ?? null,
                'address' => $data['address'] ?? null,
                'shipping_address' => $data['shipping_address'] ?? null,
                'reference' => $data['reference'] ?? null,
                'type' => $data['type'],
                'entity_type' => $data['entity_type'] ?? 'individual',
                'business_name' => $data['business_name'] ?? null,
                'customer_group_id' => $data['customer_group_id'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Left blank, generate a human-readable, guaranteed-unique id from the row's own
            // auto-increment id — CUS-000123 / SUP-000123 / CON-000123 (type-prefixed, zero-padded).
            if (blank($data['contact_code'] ?? null)) {
                $prefix = match ($contact->type->value) {
                    'customer' => 'CUS',
                    'supplier' => 'SUP',
                    default => 'CON',
                };

                $contact->forceFill(['contact_code' => sprintf('%s-%06d', $prefix, $contact->id)])->save();
            }

            $openingBalance = (float) ($data['opening_balance'] ?? 0);

            if ($openingBalance !== 0.0) {
                $this->ledger->recordContact($contact, ContactLedgerType::OpeningBalance, $openingBalance);

                $this->journal->postOpeningBalance(
                    today(),
                    // Positive = they owe us (Accounts Receivable); negative = we owe them (Accounts Payable).
                    $this->chartOfAccounts->code($openingBalance > 0 ? '1100' : '2100'),
                    $this->chartOfAccounts->code('3300'),
                    $openingBalance,
                    'contact_opening_balance',
                    $contact->id,
                    "Opening balance: {$contact->name}",
                );
            }

            return $contact;
        });
    }
}
