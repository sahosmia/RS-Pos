<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AccountTransaction;
use App\Models\Settings;
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Money-in/out trend grouped by transaction type (পর্ব ১৪) — this is
 * explicitly an operational report, not a formal financial statement, so
 * it reads `account_transactions` directly (never a Chart of Accounts
 * substitute for "cash position").
 */
class CashFlowController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $default = FiscalYear::current(Settings::current()->fiscal_year_start_month);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($validated['from'] ?? $default['start']);
        $to = Carbon::parse($validated['to'] ?? $default['end']);

        $byType = AccountTransaction::query()
            ->whereBetween('operation_date', [$from, $to])
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->orderByDesc(DB::raw('ABS(SUM(amount))'))
            ->get()
            ->map(fn (AccountTransaction $row) => [
                'type' => $row->type,
                'total' => round((float) $row->total, 2),
            ]);

        $moneyIn = round((float) $byType->where('total', '>', 0)->sum('total'), 2);
        $moneyOut = round((float) $byType->where('total', '<', 0)->sum('total'), 2);

        return Inertia::render('reports/cash-flow', [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'byType' => $byType,
            'moneyIn' => $moneyIn,
            'moneyOut' => $moneyOut,
            'net' => round($moneyIn + $moneyOut, 2),
        ]);
    }
}
