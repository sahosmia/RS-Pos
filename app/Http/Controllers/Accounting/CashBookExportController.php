<?php

namespace App\Http\Controllers\Accounting;

use App\Enums\CashBookEntryType;
use App\Http\Controllers\Controller;
use App\Models\CashBookEntry;
use App\Models\Settings;
use App\Queries\Accounting\CashBookQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class CashBookExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'entry_date' => 'Date',
        'category' => 'Category',
        'note' => 'Note',
        'type' => 'Type',
        'in_amount' => 'In',
        'out_amount' => 'Out',
    ];

    /**
     * Exports the same rows the Cash Book Datatable's "Export" dialog
     * offered — same filter as the index page, plus a row scope
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
            'category_id' => ['nullable', 'integer', 'exists:misc_transaction_categories,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = CashBookQuery::filtered($validated);

        $entries = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $entries->map(fn (CashBookEntry $entry) => array_map(
            fn (string $id) => $this->cell($entry, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'cash-book', 'Petty Cash', $headings, $rows);
    }

    /**
     * @param  Builder<CashBookEntry>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, CashBookEntry>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(CashBookEntry $entry, string $column): string|int|float|null
    {
        return match ($column) {
            'entry_date' => $entry->entry_date->toDateString(),
            'category' => $entry->category?->name ?? 'Opening Balance',
            'note' => $entry->note,
            'type' => ucwords(str_replace('_', ' ', $entry->type->value)),
            'in_amount' => $entry->type !== CashBookEntryType::Expense ? $entry->amount : null,
            'out_amount' => $entry->type === CashBookEntryType::Expense ? $entry->amount : null,
        };
    }
}
