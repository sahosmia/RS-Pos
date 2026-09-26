<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Backs the async Supplier/Customer picker in the Purchase/Sale forms
 * (doc/corrections2.md #8) — same reasoning as `ProductSearchController`:
 * a capped, matched page instead of preloading every contact.
 */
class ContactSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:255'],
            'type' => ['nullable', 'in:customer,supplier'],
        ]);

        $search = $validated['q'];

        $contacts = Contact::query()
            ->where('is_active', true)
            ->when($validated['type'] ?? null, fn (Builder $query, string $type) => match ($type) {
                'customer' => $query->customers(),
                'supplier' => $query->suppliers(),
            })
            ->where(function (Builder $query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('business_name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'phone', 'business_name', 'balance']);

        return response()->json([
            'data' => $contacts->map(fn (Contact $contact) => [
                'id' => $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'business_name' => $contact->business_name,
                'balance' => (float) $contact->balance,
            ]),
        ]);
    }
}
