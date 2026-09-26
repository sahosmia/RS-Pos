<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\Sale\PayEmiInstallmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\Emi\PayEmiInstallmentRequest;
use App\Models\Account;
use App\Models\EmiInstallment;
use App\Models\Settings;
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
            'status' => ['nullable', 'in:pending,paid,overdue'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $installments = EmiInstallmentQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $installments->getCollection()->transform(fn (EmiInstallment $installment) => [
            'id' => $installment->id,
            'invoice_no' => $installment->sale->invoice_no,
            'customer' => $installment->sale->customer->only(['id', 'name']),
            'installment_number' => $installment->installment_number,
            'due_date' => $installment->due_date->toDateString(),
            'amount' => $installment->amount,
            'paid_amount' => $installment->paid_amount,
            'status' => $installment->status,
        ]);

        return Inertia::render('sales/emi-installments/index', [
            'installments' => $installments,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance']),
            'filters' => [
                'status' => $validated['status'] ?? null,
                'search' => $validated['search'] ?? null,
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function pay(PayEmiInstallmentRequest $request, EmiInstallment $emiInstallment, PayEmiInstallmentAction $action): RedirectResponse
    {
        $data = $request->validated();

        $action->execute($emiInstallment, $data['account_id'], (float) $data['amount']);

        return to_route('emi-installments.index');
    }
}
