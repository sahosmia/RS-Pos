<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AccountStatementController extends Controller
{
    /**
     * Account statement for a date range, with a running balance that starts
     * from everything that happened before the range.
     */
    public function __invoke(Request $request, Account $account): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from']) : now()->startOfMonth();
        $to = isset($validated['to']) ? Carbon::parse($validated['to']) : now();

        $broughtForward = (float) $account->transactions()
            ->whereDate('operation_date', '<', $from->toDateString())
            ->sum('amount');

        $runningBalance = $broughtForward;

        $rows = $account->transactions()
            ->whereBetween('operation_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('operation_date')
            ->orderBy('id')
            ->get()
            ->map(function (AccountTransaction $transaction) use (&$runningBalance) {
                $runningBalance += $transaction->amount;

                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                    'operation_date' => $transaction->operation_date->toDateString(),
                    'note' => $transaction->note,
                    'reference_type' => $transaction->reference_type,
                    'reference_id' => $transaction->reference_id,
                    'balance' => round($runningBalance, 2),
                ];
            });

        $account->load('accountType:id,name');

        return Inertia::render('accounts/statement', [
            'account' => [
                'id' => $account->id,
                'name' => $account->name,
                'account_type' => $account->accountType->only(['id', 'name']),
                'account_sub_type' => $account->account_sub_type,
                'current_balance' => $account->current_balance,
                'is_active' => $account->is_active,
            ],
            'transactions' => $rows,
            'broughtForward' => round($broughtForward, 2),
            'closingBalance' => round($runningBalance, 2),
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
        ]);
    }
}
