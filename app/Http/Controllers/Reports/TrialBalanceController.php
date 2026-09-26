<?php

namespace App\Http\Controllers\Reports;

use App\Enums\NormalBalance;
use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Genuinely guaranteed balanced (পর্ব ৩৫) — every account's cached balance,
 * placed in the Debit or Credit column per its own `normal_balance`. Total
 * Debit always equals Total Credit, since that's what a balanced
 * `JournalService::post()` line pair enforces on every single entry.
 */
class TrialBalanceController extends Controller
{
    public function __invoke(): Response
    {
        $accounts = ChartOfAccount::query()->active()->orderBy('code')->get();

        $rows = $accounts->map(fn (ChartOfAccount $account) => [
            'id' => $account->id,
            'code' => $account->code,
            'name' => $account->name,
            'debit' => $account->normal_balance === NormalBalance::Debit ? $account->balance : 0.0,
            'credit' => $account->normal_balance === NormalBalance::Credit ? $account->balance : 0.0,
        ])->filter(fn (array $row) => $row['debit'] != 0.0 || $row['credit'] != 0.0)->values();

        return Inertia::render('reports/trial-balance', [
            'rows' => $rows,
            'totalDebit' => round((float) $rows->sum('debit'), 2),
            'totalCredit' => round((float) $rows->sum('credit'), 2),
        ]);
    }
}
