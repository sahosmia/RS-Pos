<?php

namespace App\Http\Controllers\OtherLiabilities;

use App\Actions\OtherLiability\AddOtherLiabilityTransactionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\OtherLiability\OtherLiabilityTransactionRequest;
use App\Models\OtherLiability;
use Illuminate\Http\RedirectResponse;

class OtherLiabilityTransactionController extends Controller
{
    public function store(OtherLiabilityTransactionRequest $request, OtherLiability $otherLiability, AddOtherLiabilityTransactionAction $addTransaction): RedirectResponse
    {
        $addTransaction->execute($otherLiability, $request->validated());

        return to_route('other-liabilities.show', $otherLiability);
    }
}
