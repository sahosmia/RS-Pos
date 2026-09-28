<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\CreateContactAction;
use App\Actions\Contact\DeleteContactAction;
use App\Actions\Contact\UpdateContactAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\Contact\BulkDestroyContactsRequest;
use App\Http\Requests\Contacts\Contact\StoreContactRequest;
use App\Http\Requests\Contacts\Contact\UpdateContactRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\CustomerGroup;
use App\Models\Settings;
use App\Queries\Contact\ContactQuery;
use App\Support\ContactLedgerDetails;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $contacts = ContactQuery::filtered($validated)
            ->withCount('ledgerEntries')
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        // Totals across the whole filtered set (not just the current page), so the
        // summary cards stay meaningful under pagination.
        $statsQuery = ContactQuery::filtered($validated);
        $stats = [
            'total' => (clone $statsQuery)->count(),
            'active' => (clone $statsQuery)->where('is_active', true)->count(),
            'total_receivable' => (float) (clone $statsQuery)->where('balance', '>', 0)->sum('balance'),
            'total_payable' => (float) abs((clone $statsQuery)->where('balance', '<', 0)->sum('balance')),
        ];

        $contacts->getCollection()->transform(fn (Contact $contact) => [
            'id' => $contact->id,
            'name' => $contact->name,
            'display_name' => $contact->display_name,
            'prefix' => $contact->prefix,
            'first_name' => $contact->first_name,
            'middle_name' => $contact->middle_name,
            'last_name' => $contact->last_name,
            'contact_code' => $contact->contact_code,
            'phone' => $contact->phone,
            'phone_alternate' => $contact->phone_alternate,
            'email' => $contact->email,
            'address' => $contact->address,
            'shipping_address' => $contact->shipping_address,
            'reference' => $contact->reference,
            'type' => $contact->type,
            'entity_type' => $contact->entity_type,
            'business_name' => $contact->business_name,
            'customer_group_id' => $contact->customer_group_id,
            'customer_group' => $contact->customerGroup?->only(['id', 'name']),
            'balance' => $contact->balance,
            'balance_label' => $contact->balance_label,
            'is_active' => $contact->is_active,
            'can_delete' => $contact->ledger_entries_count === 0,
            'can_set_opening_balance' => $contact->ledger_entries_count === 0,
        ]);

        return Inertia::render('contacts/index', [
            'contacts' => $contacts,
            'stats' => $stats,
            'customerGroups' => $this->customerGroupOptions(),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'filters' => [
                'search' => $validated['search'] ?? null,
                'type' => $validated['type'] ?? null,
                'customer_group_id' => $validated['customer_group_id'] ?? null,
                'sort' => $validated['sort'] ?? 'name',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * A plain JSON request (e.g. the Add Sale page's inline "+ new
     * customer" quick-add) gets the created contact back directly instead
     * of a redirect, so the caller never navigates away from an in-progress
     * page like a cart.
     */
    public function store(StoreContactRequest $request, CreateContactAction $createContact): RedirectResponse|JsonResponse
    {
        $contact = $createContact->execute($request->validated());

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'id' => $contact->id,
                'name' => $contact->name,
                'display_name' => $contact->display_name,
                'phone' => $contact->phone,
                'business_name' => $contact->business_name,
                'balance' => $contact->balance,
            ]);
        }

        return to_route('contacts.index');
    }

    /**
     * A contact's ledger can span years, so this defaults to a rolling
     * 90-day window rather than the whole history — `from`/`to` widen or
     * narrow it, and `ContactLedgerDetails::rowsFor()` folds everything
     * before `from` into one "Brought Forward" row so the running balance
     * inside the window still lines up.
     */
    public function show(Request $request, Contact $contact): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : now()->subDays(90)->startOfDay();
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : now()->endOfDay();

        $contact->load('customerGroup:id,name');

        $ledger = ContactLedgerDetails::rowsFor($contact, $from, $to)
            ->map(fn (array $row) => [
                ...$row,
                'type' => $row['type']->value,
                // Ledger entries carry a time (unlike sale/purchase dates), and the
                // reference ordering runs oldest → newest — like a real statement,
                // not newest-first.
                'created_at' => $row['created_at']->format('Y-m-d\TH:i:s'),
            ])
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
                'display_name' => $contact->display_name,
                'prefix' => $contact->prefix,
                'first_name' => $contact->first_name,
                'middle_name' => $contact->middle_name,
                'last_name' => $contact->last_name,
                'contact_code' => $contact->contact_code,
                'phone' => $contact->phone,
                'phone_alternate' => $contact->phone_alternate,
                'email' => $contact->email,
                'address' => $contact->address,
                'shipping_address' => $contact->shipping_address,
                'reference' => $contact->reference,
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
            'ledgerFilters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'payments' => $payments,
            'documents' => $documents,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'customerGroups' => $this->customerGroupOptions(),
            'purchases' => $contact->purchases()
                ->orderByDesc('purchase_date')
                ->orderByDesc('id')
                ->get(['id', 'invoice_no', 'purchase_date', 'total_amount', 'due_amount', 'payment_status', 'status']),
            'sales' => $contact->sales()
                ->orderByDesc('sale_date')
                ->orderByDesc('id')
                ->get(['id', 'invoice_no', 'sale_date', 'total_amount', 'due_amount', 'payment_status', 'status']),
        ]);
    }

    public function update(UpdateContactRequest $request, Contact $contact, UpdateContactAction $updateContact): RedirectResponse
    {
        $updateContact->execute($contact, $request->validated());

        return back();
    }

    /**
     * Contacts that already carry ledger history, sales, purchases, or
     * orders are kept, never deleted.
     */
    public function destroy(Contact $contact, DeleteContactAction $deleteContact): RedirectResponse
    {
        if ($blockedBy = $deleteContact->blockingReason($contact)) {
            return back()->withErrors(['contact' => $blockedBy]);
        }

        $deleteContact->execute($contact);

        return to_route('contacts.index');
    }

    public function bulkDestroy(BulkDestroyContactsRequest $request, DeleteContactAction $deleteContact): RedirectResponse
    {
        $result = $deleteContact->bulkExecute($request->validated('ids'));

        if ($result['skippedCount'] > 0) {
            return back()->withErrors([
                'contacts' => "{$result['skippedCount']} contact(s) have ledger history, sales, purchases, or orders and were kept — mark them inactive instead.",
            ]);
        }

        return back();
    }

    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'name' => 'Name',
        'contact_code' => 'Contact ID',
        'phone' => 'Phone',
        'email' => 'Email',
        'type' => 'Type',
        'business_name' => 'Business Name',
        'address' => 'Address',
        'customer_group' => 'Customer Group',
        'balance' => 'Balance',
        'is_active' => 'Status',
    ];

    /**
     * Exports the same rows the Contacts Datatable's "Export" dialog offered —
     * same filters as the index page, plus a row scope (page/all/selected)
     * and a column subset chosen in that dialog.
     */
    public function export(Request $request): SymfonyResponse
    {
        $validated = $request->validate([
            'format' => ['required', 'in:csv,xlsx,pdf'],
            'scope' => ['required', 'in:page,all,selected'],
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(array_keys(self::COLUMN_LABELS))],
            'ids' => ['required_if:scope,selected', 'array'],
            'ids.*' => ['integer'],
            'search' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:customer,supplier,both'],
            'customer_group_id' => ['nullable', 'integer', 'exists:customer_groups,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = ContactQuery::filtered($validated);

        $contacts = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $contacts->map(fn (Contact $contact) => array_map(
            fn (string $id) => $this->cell($contact, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'contacts', 'Contacts', $headings, $rows);
    }

    /**
     * @param  Builder<Contact>  $query
     * @param  array<string, mixed>  $validated
     * @return \Illuminate\Support\Collection<int, Contact>
     */
    private function pageOf(Builder $query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Contact $contact, string $column): string|int|float|null
    {
        return match ($column) {
            'name' => $contact->name,
            'contact_code' => $contact->contact_code,
            'phone' => $contact->phone,
            'email' => $contact->email,
            'type' => ucfirst($contact->type->value),
            'business_name' => $contact->business_name,
            'address' => $contact->address,
            'customer_group' => $contact->customerGroup?->name,
            'balance' => $contact->balance,
            'is_active' => $contact->is_active ? 'Active' : 'Inactive',
        };
    }

    /**
     * @return Collection<int, CustomerGroup>
     */
    private function customerGroupOptions(): Collection
    {
        return CustomerGroup::query()->orderBy('name')->get(['id', 'name']);
    }
}
