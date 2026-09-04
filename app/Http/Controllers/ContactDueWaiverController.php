<?php

namespace App\Http\Controllers;

use App\Actions\Contact\WaiveContactDueAction;
use App\Http\Requests\Contact\WaiveDueRequest;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;

class ContactDueWaiverController extends Controller
{
    /**
     * "Add Discount" (ledger-level) — waives part of a contact's due,
     * unrelated to any specific sale.
     */
    public function store(WaiveDueRequest $request, Contact $contact, WaiveContactDueAction $waiveDue): RedirectResponse
    {
        $data = $request->validated();

        $waiveDue->execute($contact, (float) $data['amount'], $data['note'] ?? null);

        return back();
    }
}
