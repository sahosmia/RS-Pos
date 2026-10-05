<?php

namespace App\Actions\Purchases\Purchase;

use App\Exceptions\InvalidSerialSelectionException;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * What a purchase form's payment section does once the purchase itself is saved. Payment works in every
 * status — an Ordered purchase can take an advance — and `$receive` additionally receives the goods:
 * the purchase is stored first (as Draft/Ordered), then run through ConfirmPurchaseAction, the one place
 * stock and ledgers move, so "Save as Received" and "Mark as Received" can never drift apart. Call it
 * inside the same transaction as the save: if it fails, the save is rolled back too.
 */
class SettlePurchaseOnSaveAction
{
    public function __construct(
        private ConfirmPurchaseAction $confirmPurchase,
        private AddPurchasePaymentAction $addPayment,
    ) {}

    /**
     * @param  array{payments?: array<int, array{account_id: int|string, amount: float|string}>|null, credit_applied?: float|string|null, serial_numbers?: array<int, array<int, string|null>>|null}  $data
     *
     * @throws ValidationException
     */
    public function execute(Purchase $purchase, array $data, bool $receive): Purchase
    {
        $payments = $data['payments'] ?? [];
        $creditApplied = (float) ($data['credit_applied'] ?? 0);

        $this->guardAmounts($purchase, $payments, $creditApplied);

        if ($receive) {
            $lineItems = $purchase->items()->orderBy('id')->get();

            try {
                return $this->confirmPurchase->execute($purchase, $payments, $creditApplied, $this->serialSelections($lineItems, $data));
            } catch (InvalidSerialSelectionException $e) {
                // Shown under the serial button of the line they were typed on.
                $index = $e->itemId === null ? false : $lineItems->search(fn ($item) => $item->id === $e->itemId);

                throw ValidationException::withMessages([$index === false ? 'error' : "serial_numbers.{$index}" => $e->getMessage()]);
            }
        }

        if ($payments === [] && $creditApplied <= 0.0) {
            return $purchase;
        }

        return $this->addPayment->execute($purchase, $payments, $creditApplied);
    }

    /**
     * The form's serials are keyed by line position; ConfirmPurchaseAction wants purchase_item ids.
     *
     * @param  Collection<int, PurchaseItem>  $lineItems
     * @param  array<string, mixed>  $data
     * @return array<int, array<int, string>>
     */
    private function serialSelections(Collection $lineItems, array $data): array
    {
        $selections = [];

        foreach ($lineItems as $index => $item) {
            $serials = array_values(array_filter($data['serial_numbers'][$index] ?? [], fn ($serial) => filled($serial)));

            if ($serials !== []) {
                $selections[$item->id] = $serials;
            }
        }

        return $selections;
    }

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function guardAmounts(Purchase $purchase, array $payments, float $creditApplied): void
    {
        $available = max((float) $purchase->supplier->balance, 0.0);

        if ($creditApplied > $available + 0.0001) {
            throw ValidationException::withMessages([
                'credit_applied' => 'Cannot apply more credit than the supplier\'s available balance of ৳'.number_format($available, 2).'.',
            ]);
        }

        $paying = array_sum(array_map(fn (array $payment) => (float) $payment['amount'], $payments)) + $creditApplied;
        $stillOwed = round((float) $purchase->total_amount - (float) $purchase->paid_amount, 2);

        if ($paying > $stillOwed + 0.0001) {
            throw ValidationException::withMessages([
                'payments' => 'Payment amount cannot exceed the remaining due amount of ৳'.number_format($stillOwed, 2).'.',
            ]);
        }
    }
}
