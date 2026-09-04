<?php

namespace App\Actions\Contact;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateContactAction
{
    public function __construct(private LedgerService $ledger) {}

    /**
     * @param  array{name: string, phone: string, email?: string|null, address?: string|null, shipping_address?: string|null, type: string, entity_type?: string, business_name?: string|null, customer_group_id?: int|null, is_active?: bool, opening_balance?: float|string|null}  $data
     */
    public function execute(array $data): Contact
    {
        return DB::transaction(function () use ($data) {
            $contact = Contact::create([
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
                'created_by' => Auth::id(),
            ]);

            $openingBalance = (float) ($data['opening_balance'] ?? 0);

            if ($openingBalance !== 0.0) {
                $this->ledger->recordContact($contact, ContactLedgerType::OpeningBalance, $openingBalance);
            }

            return $contact;
        });
    }
}
