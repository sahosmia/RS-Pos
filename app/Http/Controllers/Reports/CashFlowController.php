<?php

namespace App\Http\Controllers\Reports;

use App\Enums\DateRangePreset;
use App\Http\Controllers\Controller;
use App\Models\AccountTransaction;
use App\Models\Settings;
use App\Support\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
            'preset' => ['nullable', Rule::enum(DateRangePreset::class)],
            'from' => ['nullable', 'date', 'required_if:preset,custom'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'required_if:preset,custom'],
        ]);

        $preset = isset($validated['preset']) ? DateRangePreset::tryFrom($validated['preset']) : null;
        if (! $preset && ! isset($validated['from']) && ! isset($validated['to'])) {
            $preset = DateRangePreset::Today;
        }

        if ($preset && $preset !== DateRangePreset::Custom) {
            $range = $preset->resolve();
            $from = $range['start']->copy()->startOfDay();
            $to = $range['end']->copy()->endOfDay();
        } else {
            $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : Carbon::parse($default['start'])->startOfDay();
            $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : Carbon::parse($default['end'])->endOfDay();
        }

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
            'range' => [
                'preset' => $preset?->value ?? ($request->has('from') || $request->has('to') ? 'custom' : null),
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'byType' => $byType,
            'moneyIn' => $moneyIn,
            'moneyOut' => $moneyOut,
            'net' => round($moneyIn + $moneyOut, 2),
        ]);
    }
}
