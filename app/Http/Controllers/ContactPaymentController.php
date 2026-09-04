<?php

namespace App\Http\Controllers;

use App\Actions\Contact\RecordContactPaymentAction;
use App\Http\Requests\Contact\RecordContactPaymentRequest;
use App\Models\Account;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;

class ContactPaymentController extends Controller
{
    /**
     * "Pay Due Amount" — a standalone settlement against a contact's
     * running balance, from the Contact Detail page.
     */
    public function store(RecordContactPaymentRequest $request, Contact $contact, RecordContactPaymentAction $recordPayment): RedirectResponse
    {
        $data = $request->validated();

        $recordPayment->execute(
            $contact,
            Account::findOrFail($data['account_id']),
            (float) $data['amount'],
            $data['direction'],
            $data['note'] ?? null,
        );

        return back();
    }
}
