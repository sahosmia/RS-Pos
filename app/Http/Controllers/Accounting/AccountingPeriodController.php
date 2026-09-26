<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\AccountingPeriod\ClosePeriodAction;
use App\Http\Controllers\Controller;
use App\Models\AccountingPeriod;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AccountingPeriodController extends Controller
{
    public function index(): Response
    {
        $periods = AccountingPeriod::query()->orderBy('start_date')->with('closedBy:id,name')->get();

        return Inertia::render('accounting/accounting-periods/index', [
            'periods' => $periods->map(fn (AccountingPeriod $period) => [
                'id' => $period->id,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
                'status' => $period->status,
                'closed_at' => $period->closed_at?->toDateTimeString(),
                'closed_by' => $period->closedBy?->only(['id', 'name']),
            ]),
        ]);
    }

    public function close(AccountingPeriod $accountingPeriod, ClosePeriodAction $action): RedirectResponse
    {
        $action->execute($accountingPeriod);

        return back();
    }
}
