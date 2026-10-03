<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Models\Settings;
use App\Queries\Accounting\JournalEntryQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class JournalEntryExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'entry_date' => 'Date',
        'description' => 'Description',
        'reference' => 'Reference',
        'status' => 'Status',
        'total_debit' => 'Debit',
        'total_credit' => 'Credit',
    ];

    /**
     * Exports the same rows the Journal Entries Datatable's "Export" dialog
     * offered — same filters as the index page, plus a row scope
     * (page/all/selected) and a column subset chosen in that dialog.
     */
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'format' => ['required', 'in:csv,xlsx,pdf'],
            'scope' => ['required', 'in:page,all,selected'],
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(array_keys(self::COLUMN_LABELS))],
            'ids' => ['required_if:scope,selected', 'array'],
            'ids.*' => ['integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'chart_of_account_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = JournalEntryQuery::filtered($validated);

        $entries = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => TableExport::chunked($query),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $entries->map(fn (JournalEntry $entry) => array_map(
            fn (string $id) => $this->cell($entry, $id),
            $validated['columns'],
        ));

        return TableExport::respond($validated['format'], 'journal-entries', 'Journal Entries', $headings, $rows);
    }

    /**
     * @param  Builder<JournalEntry>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, JournalEntry>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return TableExport::chunked($query);
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(JournalEntry $entry, string $column): string|int|float|null
    {
        return match ($column) {
            'entry_date' => $entry->entry_date->toDateString(),
            'description' => $entry->description,
            'reference' => $entry->reference_type ? "{$entry->reference_type} #{$entry->reference_id}" : null,
            'status' => ucfirst($entry->status->value),
            'total_debit' => $entry->lines->sum('debit'),
            'total_credit' => $entry->lines->sum('credit'),
        };
    }
}
