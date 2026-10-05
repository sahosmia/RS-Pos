const fs = require('fs');
const BS = String.fromCharCode(92);
const edit = (f, pairs) => {
    let s = fs.readFileSync(f, 'utf8');
    for (let [a, b] of pairs) {
        a = a.replaceAll('@@', BS); b = b.replaceAll('@@', BS);
        if (!s.includes(a)) { console.error('MISSING', f, a.slice(0, 70)); process.exit(1); }
        s = s.replace(a, () => b);
    }
    fs.writeFileSync(f, s);
};
const C = 'app/Http/Controllers/Purchases/PurchaseController.php';
edit(C, [
 ['use App@@Actions@@Purchases@@Purchase@@ReceivePurchaseOnSaveAction;', 'use App@@Actions@@Purchases@@Purchase@@SettlePurchaseOnSaveAction;'],
 [`    /**
     * Saving as @@\`received@@\` stores a Draft and receives it in the same transaction (stock/ledger move
     * through ConfirmPurchaseAction), so a failed receipt — bad serials, overpayment — saves nothing.
     */
    public function store(StorePurchaseRequest $request, CreatePurchaseAction $createPurchase, ReceivePurchaseOnSaveAction $receivePurchase): RedirectResponse
    {
        $data = $request->validated();
        $receiveNow = $data['status'] === 'received';

        $purchase = DB::transaction(function () use ($data, $receiveNow, $createPurchase, $receivePurchase) {
            $purchase = $createPurchase->execute([...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            return $receiveNow ? $receivePurchase->execute($purchase, $data) : $purchase;
        });
`, `    /**
     * Saving as @@\`received@@\` stores a Draft and receives it in the same transaction (stock/ledger move
     * through ConfirmPurchaseAction); a payment entered on the form is recorded in every status. If the
     * receipt or the payment fails — bad serials, overpayment — nothing is saved.
     */
    public function store(StorePurchaseRequest $request, CreatePurchaseAction $createPurchase, SettlePurchaseOnSaveAction $settle): RedirectResponse
    {
        $data = $request->validated();
        $receiveNow = $data['status'] === 'received';

        $purchase = DB::transaction(function () use ($data, $receiveNow, $createPurchase, $settle) {
            $purchase = $createPurchase->execute([...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            return $settle->execute($purchase, $data, $receiveNow);
        });
`],
 ['UpdatePurchaseAction $updatePurchase, ReceivePurchaseOnSaveAction $receivePurchase)', 'UpdatePurchaseAction $updatePurchase, SettlePurchaseOnSaveAction $settle)'],
 [`        DB::transaction(function () use ($purchase, $data, $receiveNow, $updatePurchase, $receivePurchase) {
            $updatePurchase->execute($purchase, [...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            if ($receiveNow) {
                $receivePurchase->execute($purchase->refresh(), $data);
            }
        });`, `        DB::transaction(function () use ($purchase, $data, $receiveNow, $updatePurchase, $settle) {
            $updatePurchase->execute($purchase, [...$data, 'status' => $receiveNow ? 'draft' : $data['status']]);

            $settle->execute($purchase->refresh(), $data, $receiveNow);
        });`],
 ["        $purchase->delete();", `        if ($purchase->paid_amount > 0) {
            return back()->withErrors(['purchase' => 'This purchase already has a payment recorded — cancel it instead, so the payment is reversed properly.']);
        }

        $purchase->delete();`],
 ["                'status' => $purchase->status,\n                'discount_type' => $purchase->discount_type?->value,", "                'status' => $purchase->status,\n                'paid_amount' => $purchase->paid_amount,\n                'discount_type' => $purchase->discount_type?->value,"],
]);
edit('app/Actions/Purchases/Purchase/UpdatePurchaseAction.php', [
 ['use Illuminate@@Support@@Facades@@DB;', 'use Illuminate@@Support@@Facades@@DB;\nuse Illuminate@@Validation@@ValidationException;'],
 [`            PurchaseTotals::sync($purchase, $data['items'])->applyTo($purchase);
`, `            PurchaseTotals::sync($purchase, $data['items'])->applyTo($purchase);

            // applyTo() resets due to the full total; an advance already paid has to be counted again.
            $purchase->recalculatePaymentTotals();

            if ($purchase->due_amount < 0) {
                throw ValidationException::withMessages([
                    'items' => 'The total cannot go below the ৳'.number_format($purchase->paid_amount, 2).' already paid on this purchase.',
                ]);
            }
`],
]);
edit('app/Http/Requests/Purchases/Purchase/PurchasePaymentRequest.php', [
 ["$maxAllowed = $purchase->status === PurchaseStatus::Received ? (float) $purchase->due_amount : (float) $purchase->total_amount;", "$maxAllowed = (float) $purchase->due_amount;"],
 ["use App@@Enums@@PurchaseStatus;\n", ""],
]);
edit('app/Http/Controllers/Purchases/PurchasePaymentController.php', [
 ["use App@@Enums@@PurchaseStatus;", "use App@@Enums@@PurchaseStatus;"],
 ["        if ($purchase->status !== PurchaseStatus::Received) {\n            return back()->withErrors(['purchase' => 'Only a received purchase can take a payment.']);", "        if ($purchase->status === PurchaseStatus::Cancelled) {\n            return back()->withErrors(['purchase' => 'A cancelled purchase cannot take a payment.']);"],
 ["Settles more of an already-Received purchase's due — separate from\n     * confirming receipt.", "Settles more of a purchase's due — in any status but Cancelled (an Ordered\n     * purchase can take an advance) — separate from confirming receipt."],
]);
