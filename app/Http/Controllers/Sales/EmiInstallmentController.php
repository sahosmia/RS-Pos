<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\Sale\PayEmiInstallmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\Emi\PayEmiInstallmentRequest;
use App\Models\Account;
use App\Models\EmiInstallment;
use App\Models\Settings;
use App\Queries\EmiInstallment\EmiCollectionSummary;
use App\Queries\EmiInstallment\EmiInstallmentQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmiInstallmentController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,paid,overdue,cancelled'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
            'group' => ['nullable', 'in:'.implode(',', EmiCollectionSummary::GROUPS)],
            'year' => ['nullable', 'integer', 'between:2000,2100'],
        ]);

        $group = $validated['group'] ?? 'month';
        $year = isset($validated['year']) ? (int) $validated['year'] : null;
        $collection = EmiCollectionSummary::forGroup($group, $year);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $installments = EmiInstallmentQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $installments->getCollection()->transform(fn (EmiInstallment $installment) => [
            'id' => $installment->id,
            'invoice_no' => $installment->sale->invoice_no,
            'customer' => $installment->sale->customer->only(['id', 'name', 'phone']),
            'installment_number' => $installment->installment_number,
            'due_date' => $installment->due_date->toDateString(),
            'amount' => $installment->amount,
            'paid_amount' => $installment->paid_amount,
            'status' => $installment->status,
        ]);

        return Inertia::render('sales/emi-installments/index', [
            'installments' => $installments,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'headline' => EmiCollectionSummary::headline(),
            'collection' => $collection,
            'filters' => [
                'group' => $group,
                'year' => $collection['year'],
                'status' => $validated['status'] ?? null,
                'search' => $validated['search'] ?? null,
                'sort' => $validated['sort'] ?? 'due_date',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function pay(PayEmiInstallmentRequest $request, EmiInstallment $emiInstallment, PayEmiInstallmentAction $action): RedirectResponse
    {
        $data = $request->validated();

        $action->execute($emiInstallment, $data['account_id'], (float) $data['amount']);

        // Back to wherever it was paid from: the installments list, or the sale's own installment plan.
        return back();
    }
}
