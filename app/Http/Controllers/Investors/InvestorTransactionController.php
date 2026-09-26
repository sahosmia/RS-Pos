<?php

namespace App\Http\Controllers\Investors;

use App\Actions\Investor\AddInvestorTransactionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Investor\InvestorTransactionRequest;
use App\Models\Investor;
use Illuminate\Http\RedirectResponse;

class InvestorTransactionController extends Controller
{
    public function store(InvestorTransactionRequest $request, Investor $investor, AddInvestorTransactionAction $addTransaction): RedirectResponse
    {
        $addTransaction->execute($investor, $request->validated());

        return to_route('investors.show', $investor);
    }
}
