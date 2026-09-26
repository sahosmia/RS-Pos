<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\EmiInstallment;
use App\Models\Settings;
use App\Queries\EmiInstallment\EmiInstallmentQuery;
use App\Support\TableExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class EmiInstallmentExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const COLUMN_LABELS = [
        'invoice_no' => 'Invoice No',
        'customer' => 'Customer',
        'installment_number' => 'Installment #',
        'due_date' => 'Due Date',
        'amount' => 'Amount',
        'paid_amount' => 'Paid',
        'status' => 'Status',
    ];

    /**
     * Exports the same rows the EMI Installments Datatable's "Export" dialog
     * offered — same filters as the index page, plus a row scope (page/all/
     * selected) and a column subset chosen in that dialog.
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
            'status' => ['nullable', 'in:pending,paid,overdue'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $query = EmiInstallmentQuery::filtered($validated);

        $installments = match ($validated['scope']) {
            'selected' => $query->whereIn('id', $validated['ids'])->get(),
            'page' => $this->pageOf($query, $validated),
            'all' => $query->get(),
        };

        $headings = array_map(fn (string $id) => self::COLUMN_LABELS[$id], $validated['columns']);

        $rows = $installments->map(fn (EmiInstallment $installment) => array_map(
            fn (string $id) => $this->cell($installment, $id),
            $validated['columns'],
        ))->all();

        return TableExport::respond($validated['format'], 'emi-installments', 'EMI Installments', $headings, $rows);
    }

    /**
     * @param  Builder<EmiInstallment>  $query
     * @param  array<string, mixed>  $validated
     * @return Collection<int, EmiInstallment>
     */
    private function pageOf($query, array $validated)
    {
        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        if ($perPage === null) {
            return $query->get();
        }

        return $query->forPage($validated['page'] ?? 1, $perPage)->get();
    }

    private function cell(EmiInstallment $installment, string $column): string|int|float|null
    {
        return match ($column) {
            'invoice_no' => $installment->sale->invoice_no,
            'customer' => $installment->sale->customer->name,
            'installment_number' => $installment->installment_number,
            'due_date' => $installment->due_date->toDateString(),
            'amount' => $installment->amount,
            'paid_amount' => $installment->paid_amount,
            'status' => ucfirst($installment->status->value),
        };
    }
}
