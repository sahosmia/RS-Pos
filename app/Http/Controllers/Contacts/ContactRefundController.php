<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\RefundContactCreditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\Contact\RefundContactCreditRequest;
use App\Models\Account;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;

class ContactRefundController extends Controller
{
    /**
     * "Refund" — pays a customer's credit (advance / overpayment) back out of
     * one of the shop's accounts.
     */
    public function store(RefundContactCreditRequest $request, Contact $contact, RefundContactCreditAction $refund): RedirectResponse
    {
        $data = $request->validated();

        $refund->execute(
            $contact,
            Account::findOrFail($data['account_id']),
            (float) $data['amount'],
            $data['note'] ?? null,
        );

        return back();
    }
}
