<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Staff;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Customer-wise receivable, supplier-wise payable, and staff advance/loan
 * balances (পর্ব ১৪) — operational detail from Contact/Staff directly,
 * not the Balance Sheet's GL totals (this report explains *who* makes up
 * that total, the Balance Sheet only needs the total itself).
 */
class DueReportController extends Controller
{
    /**
     * The report is "biggest debtors first", not a full directory — capped
     * so a shop with thousands of contacts doesn't ship every single one of
     * them (most with tiny/irrelevant balances) in one Inertia response.
     * Totals are summed in the DB separately, so they stay correct even
     * when the row list itself is capped.
     */
    private const MAX_ROWS = 200;

    public function __invoke(): Response
    {
        $customerQuery = fn () => Contact::query()->whereIn('type', ['customer', 'both'])->where('balance', '>', 0);
        $supplierQuery = fn () => Contact::query()->whereIn('type', ['supplier', 'both'])->where('balance', '<', 0);
        $staffQuery = fn () => Staff::query()->where('balance', '!=', 0);

        $customersCount = $customerQuery()->count();
        $suppliersCount = $supplierQuery()->count();
        $staffCount = $staffQuery()->count();

        $customers = $customerQuery()->orderByDesc('balance')->limit(self::MAX_ROWS)->get(['id', 'name', 'phone', 'balance']);

        $suppliers = $supplierQuery()->orderBy('balance')->limit(self::MAX_ROWS)->get(['id', 'name', 'phone', 'balance'])
            ->map(fn (Contact $contact) => [
                'id' => $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'balance' => abs($contact->balance),
            ]);

        $staff = $staffQuery()->orderByDesc('balance')->limit(self::MAX_ROWS)->get(['id', 'name', 'balance']);

        return Inertia::render('reports/due-report', [
            'customers' => $customers,
            'suppliers' => $suppliers->values(),
            'staff' => $staff,
            'customersTotalCount' => $customersCount,
            'suppliersTotalCount' => $suppliersCount,
            'staffTotalCount' => $staffCount,
            'totalReceivable' => round((float) $customerQuery()->sum('balance'), 2),
            'totalPayable' => round(abs((float) $supplierQuery()->sum('balance')), 2),
        ]);
    }
}
