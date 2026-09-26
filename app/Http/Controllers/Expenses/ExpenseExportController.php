<?php

namespace App\Http\Controllers\Expenses;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Settings;
use App\Queries\Expenses\ExpenseQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ExpenseExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'expense_date' => 'Date',
        'category' => 'Category',
        'contact' => 'Vendor',
        'total_amount' => 'Total',
        'due_amount' => 'Due',
        'payment_status' => 'Status',
        'note' => 'Note',
    ];

    /**
     * Exports the same rows the Expenses Datatable's "Export" dialog offered —
     * same filters as the index page, plus a row scope (page/all/selected)
     * and a column subset chosen in that dialog.
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
            'expense_category_id' => ['nullable', 'integer', 'exists:expense_categories,id'],
            'payment_status' => ['nullable', 'in:due,partial,paid'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = ExpenseQuery::filtered($validated);

        $expenses = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $expenses->map(fn (Expense $expense) => array_map(
            fn (string $id) => $this->cell($expense, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'expenses', 'Expenses', $headings, $rows);
    }

    /**
     * @param  Builder<Expense>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, Expense>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(Expense $expense, string $column): string|int|float|null
    {
        return match ($column) {
            'expense_date' => $expense->expense_date->toDateString(),
            'category' => $expense->category->name,
            'contact' => $expense->contact?->name,
            'total_amount' => $expense->total_amount,
            'due_amount' => $expense->due_amount,
            'payment_status' => ucfirst($expense->payment_status->value),
            'note' => $expense->note,
        };
    }
}
