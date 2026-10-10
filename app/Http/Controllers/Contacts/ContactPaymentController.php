<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\ReceiveContactDiscountAction;
use App\Actions\Contact\RecordContactPaymentAction;
use App\Actions\Contact\WaiveContactDueAction;
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
use Illuminate\Support\Facades\DB;

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
        WaiveContactDueAction $waiveDue,
        ReceiveContactDiscountAction $receiveDiscount,
    ): RedirectResponse {
        $data = $request->validated();
        $amount = (float) ($data['amount'] ?? 0);
        $discount = (float) ($data['discount_amount'] ?? 0);

        if (! empty($data['sale_id']) && Sale::findOrFail($data['sale_id'])->status !== SaleStatus::Confirmed) {
            return back()->withErrors(['sale_id' => 'Only a confirmed sale can take a payment.']);
        }

        if (! empty($data['purchase_id']) && Purchase::findOrFail($data['purchase_id'])->status !== PurchaseStatus::Received) {
            return back()->withErrors(['purchase_id' => 'Only a received purchase can take a payment.']);
        }

        // Discount and payment settle together or not at all.
        DB::transaction(function () use ($data, $contact, $amount, $discount, $recordPayment, $addSalePayment, $addPurchasePayment, $waiveDue, $receiveDiscount) {
            if ($discount > 0) {
                $data['direction'] === 'received'
                    ? $waiveDue->execute($contact, $discount, $data['note'] ?? null, $data['sale_id'] ?? null)
                    : $receiveDiscount->execute($contact, $discount, $data['note'] ?? null, $data['purchase_id'] ?? null);
            }

            if ($amount <= 0) {
                return;
            }

            if (! empty($data['sale_id'])) {
                $addSalePayment->execute(Sale::findOrFail($data['sale_id']), [
                    ['account_id' => $data['account_id'], 'amount' => $amount],
                ]);
            } elseif (! empty($data['purchase_id'])) {
                $addPurchasePayment->execute(Purchase::findOrFail($data['purchase_id']), [
                    ['account_id' => $data['account_id'], 'amount' => $amount],
                ]);
            } else {
                $recordPayment->execute(
                    $contact,
                    Account::findOrFail($data['account_id']),
                    $amount,
                    $data['direction'],
                    $data['note'] ?? null,
                );
            }
        });

        return back();
    }
}
