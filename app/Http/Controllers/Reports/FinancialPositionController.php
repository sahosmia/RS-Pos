<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Support\FinancialPositionReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Ledger-per-module "Financial Position" (as-of-date) — a second, simpler
 * balance sheet next to `BalanceSheetController`'s formal double-entry one,
 * gated by its own `financial_position.view` permission rather than the
 * general `report.view` every other report shares.
 */
class FinancialPositionController extends Controller
{
    public function __invoke(Request $request): Response|JsonResponse
    {
        $validated = $request->validate([
            'end_date' => ['nullable', 'date'],
        ]);

        $endDate = isset($validated['end_date']) ? Carbon::parse($validated['end_date']) : Carbon::today();

        // Changing the date filter re-fetches over AJAX (see the page's own
        // fetch call) instead of a full Inertia visit, so a failure here
        // shouldn't ever surface as a raw 500 — the page already has a
        // report on screen and just needs to know this attempt failed.
        if ($request->wantsJson()) {
            try {
                return response()->json(['report' => FinancialPositionReport::forEndDate($endDate)]);
            } catch (Throwable $e) {
                Log::error('Financial Position report failed to build.', ['end_date' => $endDate->toDateString(), 'exception' => $e]);

                return response()->json(['message' => 'Could not build the report for this date.'], 500);
            }
        }

        return Inertia::render('reports/financial-position', [
            'report' => FinancialPositionReport::forEndDate($endDate),
        ]);
    }
}
