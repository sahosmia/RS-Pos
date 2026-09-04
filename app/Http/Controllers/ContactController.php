<?php

namespace App\Http\Controllers;

use App\Actions\Contact\CreateContactAction;
use App\Actions\Contact\UpdateContactAction;
use App\Http\Requests\Contact\BulkDestroyContactsRequest;
use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\CustomerGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    /**
     * Customer and Supplier share one page — `?type=` filters the same list.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:customer,supplier,both'],
            'customer_group_id' => ['nullable', 'integer', 'exists:customer_groups,id'],
        ]);

        $contacts = Contact::query()
            ->with('customerGroup:id,name')
            ->withCount('ledgerEntries')
            ->when($validated['search'] ?? null, fn (Builder $query, string $search) => $query->where(function (Builder $query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when($validated['type'] ?? null, function (Builder $query, string $type) {
                match ($type) {
                    'customer' => $query->customers(),
                    'supplier' => $query->suppliers(),
                    'both' => $query->where('type', 'both'),
                };
            })
            ->when($validated['customer_group_id'] ?? null, fn (Builder $query, int $id) => $query->where('customer_group_id', $id))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $contacts->getCollection()->transform(fn (Contact $contact) => [
            'id' => $contact->id,
            'name' => $contact->name,
            'phone' => $contact->phone,
            'email' => $contact->email,
            'type' => $contact->type,
            'entity_type' => $contact->entity_type,
            'business_name' => $contact->business_name,
            'customer_group' => $contact->customerGroup?->only(['id', 'name']),
            'balance' => $contact->balance,
            'balance_label' => $contact->balance_label,
            'is_active' => $contact->is_active,
            'can_delete' => $contact->ledger_entries_count === 0,
            'can_set_opening_balance' => $contact->canSetOpeningBalance(),
        ]);

        return Inertia::render('contacts/index', [
            'contacts' => $contacts,
            'customerGroups' => CustomerGroup::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $validated['search'] ?? null,
                'type' => $validated['type'] ?? null,
                'customer_group_id' => $validated['customer_group_id'] ?? null,
            ],
        ]);
    }

    public function store(StoreContactRequest $request, CreateContactAction $createContact): RedirectResponse
    {
        $createContact->execute($request->validated());

        return to_route('contacts.index');
    }

    public function show(Contact $contact): Response
    {
        $contact->load('customerGroup:id,name');

        $runningBalance = 0.0;
        $ledger = $contact->ledgerEntries()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function ($entry) use (&$runningBalance) {
                $runningBalance += $entry->amount;

                return [
                    'id' => $entry->id,
                    'type' => $entry->type->value,
                    'amount' => $entry->amount,
                    'note' => $entry->note,
                    'reference_type' => $entry->reference_type,
                    'reference_id' => $entry->reference_id,
                    'created_at' => $entry->created_at->toDateString(),
                    'balance' => round($runningBalance, 2),
                ];
            })
            ->reverse()
            ->values();

        $payments = $ledger->whereIn('type', ['payment_received', 'payment_made'])->values();

        $documents = $contact->getMedia('documents')->map(fn ($media) => [
            'id' => $media->id,
            'name' => $media->name,
            'file_name' => $media->file_name,
            'size' => $media->size,
            'url' => $media->getUrl(),
            'created_at' => $media->created_at->toDateString(),
        ]);

        return Inertia::render('contacts/show', [
            'contact' => [
                'id' => $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'email' => $contact->email,
                'address' => $contact->address,
                'shipping_address' => $contact->shipping_address,
                'type' => $contact->type,
                'entity_type' => $contact->entity_type,
                'business_name' => $contact->business_name,
                'customer_group_id' => $contact->customer_group_id,
                'customer_group' => $contact->customerGroup?->only(['id', 'name']),
                'balance' => $contact->balance,
                'balance_label' => $contact->balance_label,
                'is_active' => $contact->is_active,
                'can_set_opening_balance' => $contact->canSetOpeningBalance(),
            ],
            'ledger' => $ledger,
            'payments' => $payments,
            'documents' => $documents,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
            'customerGroups' => CustomerGroup::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateContactRequest $request, Contact $contact, UpdateContactAction $updateContact): RedirectResponse
    {
        $updateContact->execute($contact, $request->validated());

        return back();
    }

    /**
     * Contacts that already carry ledger history are kept, never deleted.
     */
    public function destroy(Contact $contact): RedirectResponse
    {
        if ($contact->ledgerEntries()->exists()) {
            return back()->withErrors([
                'contact' => 'This contact has ledger history — mark it inactive instead of deleting it.',
            ]);
        }

        $contact->delete();

        return to_route('contacts.index');
    }

    public function bulkDestroy(BulkDestroyContactsRequest $request): RedirectResponse
    {
        $ids = $request->validated('ids');

        $deletable = Contact::query()
            ->whereIn('id', $ids)
            ->whereDoesntHave('ledgerEntries')
            ->pluck('id');

        Contact::query()->whereIn('id', $deletable)->delete();

        $skipped = count($ids) - $deletable->count();

        if ($skipped > 0) {
            return back()->withErrors([
                'contacts' => "{$skipped} contact(s) have ledger history and were kept — mark them inactive instead.",
            ]);
        }

        return back();
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:contacts,id'],
        ]);

        $contacts = Contact::query()->whereIn('id', $validated['ids'])->orderBy('name')->get();

        return ResponseFacade::streamDownload(function () use ($contacts) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Name', 'Phone', 'Email', 'Type', 'Balance']);

            foreach ($contacts as $contact) {
                fputcsv($handle, [$contact->name, $contact->phone, $contact->email, $contact->type->value, $contact->balance]);
            }

            fclose($handle);
        }, 'contacts.csv', ['Content-Type' => 'text/csv']);
    }
}
