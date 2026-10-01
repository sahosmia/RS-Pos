<?php

namespace App\Http\Controllers\CompanyLoans;

use App\Actions\CompanyLoan\CreateCompanyLoanAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompanyLoan\StoreCompanyLoanRequest;
use App\Http\Requests\CompanyLoan\UpdateCompanyLoanRequest;
use App\Models\Account;
use App\Models\CompanyLoan;
use App\Models\LoanTransaction;
use App\Models\Settings;
use App\Queries\CompanyLoan\CompanyLoanQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyLoanController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $loans = CompanyLoanQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $loans->getCollection()->transform(fn (CompanyLoan $loan) => [
            'id' => $loan->id,
            'lender_name' => $loan->lender_name,
            'loan_amount' => $loan->loan_amount,
            'interest_rate' => $loan->interest_rate,
            'outstanding_balance' => $loan->outstanding_balance,
            'start_date' => $loan->start_date->toDateString(),
            'can_delete' => $loan->transactions_count === 0,
        ]);

        return Inertia::render('company-loans/index', [
            'loans' => $loans,
            'totalOutstanding' => (float) CompanyLoan::query()->sum('outstanding_balance'),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'filters' => [
                'sort' => $validated['sort'] ?? 'lender_name',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * Creating a loan posts its `loan_amount` as the opening balance (see CreateCompanyLoanAction).
     * Editing afterwards only changes the informational terms — no journal/ledger effect;
     * every later balance change goes through AddLoanTransactionAction.
     */
    public function store(StoreCompanyLoanRequest $request, CreateCompanyLoanAction $createLoan): RedirectResponse
    {
        $createLoan->execute($request->validated());

        return to_route('company-loans.index');
    }

    public function update(UpdateCompanyLoanRequest $request, CompanyLoan $companyLoan): RedirectResponse
    {
        $companyLoan->update($request->validated());

        return to_route('company-loans.index');
    }

    public function show(CompanyLoan $companyLoan): Response
    {
        $runningBalance = 0.0;

        $rows = $companyLoan->transactions()
            ->with('account:id,name')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (LoanTransaction $transaction) use (&$runningBalance) {
                $runningBalance += $transaction->amount;

                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                    'account' => $transaction->account?->only(['id', 'name']),
                    'note' => $transaction->note,
                    'created_at' => $transaction->created_at->toDateString(),
                    'balance' => round($runningBalance, 2),
                ];
            });

        return Inertia::render('company-loans/show', [
            'loan' => [
                'id' => $companyLoan->id,
                'lender_name' => $companyLoan->lender_name,
                'loan_amount' => $companyLoan->loan_amount,
                'interest_rate' => $companyLoan->interest_rate,
                'outstanding_balance' => $companyLoan->outstanding_balance,
                'start_date' => $companyLoan->start_date->toDateString(),
            ],
            'transactions' => $rows,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Loans that already carry history are kept — corrections go through a
     * transaction, never a delete.
     */
    public function destroy(CompanyLoan $companyLoan): RedirectResponse
    {
        if ($companyLoan->transactions()->exists()) {
            return back()->withErrors([
                'company_loan' => 'This loan has recorded transactions and cannot be deleted.',
            ]);
        }

        $companyLoan->delete();

        return to_route('company-loans.index');
    }
}
