<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

class UpdateContactAction
{
    public function __construct(
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{name: string, phone: string, email?: string|null, address?: string|null, shipping_address?: string|null, type: string, entity_type?: string, business_name?: string|null, customer_group_id?: int|null, is_active?: bool, opening_balance?: float|string|null}  $data
     */
    public function execute(Contact $contact, array $data): Contact
    {
        return DB::transaction(function () use ($contact, $data) {
            $contact->update([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'address' => $data['address'] ?? null,
                'shipping_address' => $data['shipping_address'] ?? null,
                'type' => $data['type'],
                'entity_type' => $data['entity_type'] ?? 'individual',
                'business_name' => $data['business_name'] ?? null,
                'customer_group_id' => $data['customer_group_id'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            // Only reachable while the contact still has zero ledger
            // entries — guarded server-side by ContactOpeningBalanceEditable.
            $openingBalance = (float) ($data['opening_balance'] ?? 0);

            if ($contact->canSetOpeningBalance() && $openingBalance !== 0.0) {
                $this->ledger->recordContact($contact, ContactLedgerType::OpeningBalance, $openingBalance);

                $this->journal->postOpeningBalance(
                    today(),
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
