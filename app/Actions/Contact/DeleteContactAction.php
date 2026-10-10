<?php

namespace App\Actions\Contact;

use App\Models\Contact;

class DeleteContactAction
{
    /**
     * Every relation with `restrictOnDelete()` on `contact_id`/`customer_id`/
     * `supplier_id` — checked explicitly so a draft sale/purchase/order (which
     * has no ledger entry yet) still blocks deletion instead of hitting the
     * database FK constraint directly.
     *
     * @return string|null A human-readable reason, or null if deletion is safe.
     */
    public function blockingReason(Contact $contact): ?string
    {
        return match (true) {
            $contact->ledgerEntries()->exists() => 'This contact has ledger history — mark it inactive instead of deleting it.',
            $contact->sales()->exists() => 'This contact has recorded sales — mark it inactive instead of deleting it.',
            $contact->purchases()->withTrashed()->exists() => 'This contact has recorded purchases — mark it inactive instead of deleting it.',
            $contact->salesOrders()->exists() => 'This contact has sales orders — mark it inactive instead of deleting it.',
            default => null,
        };
    }

    public function execute(Contact $contact): void
    {
        $contact->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return array{deletedCount: int, skippedCount: int}
     */
    public function bulkExecute(array $ids): array
    {
        $deletableIds = Contact::query()
            ->whereIn('id', $ids)
            ->whereDoesntHave('ledgerEntries')
            ->whereDoesntHave('sales')
            ->whereDoesntHave('purchases', fn ($query) => $query->withTrashed())
            ->whereDoesntHave('salesOrders')
            ->pluck('id');

        Contact::query()->whereIn('id', $deletableIds)->delete();

        return [
            'deletedCount' => $deletableIds->count(),
            'skippedCount' => count($ids) - $deletableIds->count(),
        ];
    }
}
