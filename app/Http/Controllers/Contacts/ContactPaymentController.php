<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\RecordContactPaymentAction;
use App\Actions\Purchases\Purchase\AddPurchasePaymentAction;
use App\Actions\Sales\Sale\AddSalePaymentAction;
use App\Enums\PurchaseStatus;
use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\Contact\RecordContactPaymentRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;

class ContactPaymentController extends Controller
{
    /**
     * "Pay Due Amount" — a settlement against a contact's balance, from the
     * Contact Detail page. When a specific sale/purchase is targeted, this
     * reuses the same actions the Sale/Purchase "Add Payment" flows use, so
     * that invoice's due_amount stays correct; otherwise it falls back to
     * RecordContactPaymentAction for a general-balance settlement not tied
     * to any one invoice.
     */
    public function store(
        RecordContactPaymentRequest $request,
        Contact $contact,
        RecordContactPaymentAction $recordPayment,
        AddSalePaymentAction $addSalePayment,
        AddPurchasePaymentAction $addPurchasePayment,
    ): RedirectResponse {
        $data = $request->validated();

        if (! empty($data['sale_id'])) {
            $sale = Sale::findOrFail($data['sale_id']);

            if ($sale->status !== SaleStatus::Confirmed) {
                return back()->withErrors(['sale_id' => 'Only a confirmed sale can take a payment.']);
            }

            $addSalePayment->execute($sale, [
                ['account_id' => $data['account_id'], 'amount' => $data['amount']],
            ]);

            return back();
        }

        if (! empty($data['purchase_id'])) {
            $purchase = Purchase::findOrFail($data['purchase_id']);

            if ($purchase->status !== PurchaseStatus::Received) {
                return back()->withErrors(['purchase_id' => 'Only a received purchase can take a payment.']);
            }

            $addPurchasePayment->execute($purchase, [
                ['account_id' => $data['account_id'], 'amount' => $data['amount']],
            ]);

            return back();
        }

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
