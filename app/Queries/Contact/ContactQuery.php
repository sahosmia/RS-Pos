<?php

namespace App\Queries\Contact;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;

class ContactQuery
{
    /**
     * Shared by the Contacts list page and its export endpoint so the two
     * never drift apart — an export must return exactly the rows the list
     * page shows for the same filters.
     *
     * @param  array{search?: ?string, type?: ?string, customer_group_id?: ?int}  $filters
     * @return Builder<Contact>
     */
    public static function filtered(array $filters): Builder
    {
        return Contact::query()
            ->with('customerGroup:id,name')
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(function (Builder $query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when($filters['type'] ?? null, function (Builder $query, string $type) {
                match ($type) {
                    'customer' => $query->customers(),
                    'supplier' => $query->suppliers(),
                    'both' => $query->where('type', 'both'),
                };
            })
            ->when($filters['customer_group_id'] ?? null, fn (Builder $query, int $id) => $query->where('customer_group_id', $id))
            ->orderBy('name');
    }
}
