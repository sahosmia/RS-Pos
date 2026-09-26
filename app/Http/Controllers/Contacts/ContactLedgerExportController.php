<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Support\ContactLedgerDetails;
use App\Support\TableExport;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ContactLedgerExportController extends Controller
{
    /**
     * A summary statement (one row per ledger entry) — the item-by-item
     * breakdown `ContactLedgerTable` shows per invoice stays a browser-print
     * concern (it prints the actual page, items and all); a flat PDF/Excel
     * export follows the same headings/rows shape every other list export
     * already uses via `TableExport::respond()`.
     *
     * `from`/`to` are optional here (unlike the page, which always applies
     * its rolling default) — passed by the page so "Export" downloads
     * exactly the range currently on screen, but omitting them exports the
     * full history.
     */
    public function __invoke(Request $request, Contact $contact): Response
    {
        $validated = $request->validate([
            'format' => ['required', Rule::in(['csv', 'xlsx', 'pdf'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : null;

        $headings = ['Date', 'Reference No', 'Type', 'Debit', 'Credit', 'Balance', 'Note'];

        $rows = ContactLedgerDetails::rowsFor($contact, $from, $to)->map(fn (array $row) => [
            $row['created_at']->format('Y-m-d H:i'),
            $row['reference_label'] ?? '—',
            ucfirst(str_replace('_', ' ', $row['type']->value)),
            $row['amount'] > 0 ? $row['amount'] : null,
            $row['amount'] < 0 ? abs($row['amount']) : null,
            $row['balance'],
            $row['note'],
        ])->all();

        return TableExport::respond($validated['format'], "contact-{$contact->id}-ledger", "Ledger — {$contact->name}", $headings, $rows);
    }
}
