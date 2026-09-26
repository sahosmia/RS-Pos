<?php

namespace App\Http\Controllers\CompanyLoans;

use App\Actions\CompanyLoan\AddLoanTransactionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompanyLoan\LoanTransactionRequest;
use App\Models\CompanyLoan;
use Illuminate\Http\RedirectResponse;

class LoanTransactionController extends Controller
{
    public function store(LoanTransactionRequest $request, CompanyLoan $companyLoan, AddLoanTransactionAction $addTransaction): RedirectResponse
    {
        $addTransaction->execute($companyLoan, $request->validated());

        return to_route('company-loans.show', $companyLoan);
    }
}
