<?php

namespace App\Http\Controllers;

use App\Actions\Account\FundTransferAction;
use App\Http\Requests\Account\StoreFundTransferRequest;
use App\Models\Account;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

class FundTransferController extends Controller
{
    public function store(StoreFundTransferRequest $request, FundTransferAction $fundTransfer): RedirectResponse
    {
        $data = $request->validated();

        $fundTransfer->execute(
            Account::findOrFail($data['from_account_id']),
            Account::findOrFail($data['to_account_id']),
            (float) $data['amount'],
            Carbon::parse($data['transfer_date']),
            $data['note'] ?? null,
        );

        return to_route('accounts.index');
    }
}
