<?php

namespace App\Actions\Purchase;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\PurchaseStatus;
use App\Enums\SerialNumberStatus;
use App\Enums\StockMovementType;
use App\Exceptions\InvalidSerialSelectionException;
use App\Models\Account;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\SerialNumber;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

/**
 * Marks a Draft/Ordered purchase Received — the one place stock and the
 * supplier's ledger actually move for this purchase. Every item's
 * Weighted Average Cost is recalculated in the same transaction as the
 * stock increase, and any payment collected at receipt time (cash and/or
 * applying existing supplier credit) is recorded alongside.
 */
class ConfirmPurchaseAction
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     * @param  array<int, array<int, string>>  $serialSelections  Keyed by purchase_item_id — the serial number of each unit received, required when the product tracks serials.
     *
     * @throws InvalidSerialSelectionException
     */
    public function execute(Purchase $purchase, array $payments = [], float $creditApplied = 0.0, array $serialSelections = []): Purchase
    {
        if ($purchase->status === PurchaseStatus::Received) {
            return $purchase;
        }

        return DB::transaction(function () use ($purchase, $payments, $creditApplied, $serialSelections) {
            $purchase->load('items.product', 'supplier');

            foreach ($purchase->items as $item) {
                $this->receiveItem($purchase, $item, $serialSelections[$item->id] ?? []);
            }

            $paidViaAccounts = 0.0;

            if ($payments !== []) {
                // Money leaving our accounts is negative, per AccountService's signed-amount convention.
                $negatedPayments = array_map(fn (array $payment) => [
                    'account_id' => $payment['account_id'],
                    'amount' => -abs((float) $payment['amount']),
                ], $payments);

                $paidViaAccounts = abs($this->accounts->recordSplitPayment(
                    $negatedPayments,
                    AccountTransactionType::PurchasePayment,
                    $purchase->purchase_date,
                    'purchase',
                    $purchase->id,
                ));
            }

            $creditApplied = round($creditApplied, 2);

            if ($creditApplied > 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::CreditApplied, -$creditApplied, 'purchase', $purchase->id);
            }

            $dueAmount = round($purchase->total_amount - $paidViaAccounts - $creditApplied, 2);

            if ($dueAmount !== 0.0) {
                $this->ledger->recordContact($purchase->supplier, ContactLedgerType::PurchaseBill, -$dueAmount, 'purchase', $purchase->id);
            }

            $purchase->update(['status' => PurchaseStatus::Received]);
            $purchase->recalculatePaymentTotals();

            $this->postJournal($purchase, $payments);

            return $purchase->fresh(['items.product', 'supplier']);
        });
    }

    /**
     * Dr Inventory, Cr Accounts Payable for the full purchase value; any
     * cash paid at receipt time on top of that is Dr Accounts Payable,
     * Cr {the paying account}, one line per account. Supplier credit
     * applied needs no separate line — it nets naturally against Accounts
     * Payable's existing balance.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postJournal(Purchase $purchase, array $payments): void
    {
        $inventory = $this->chartOfAccounts->code('1200');
        $payable = $this->chartOfAccounts->code('2100');

        $lines = [
            ['chart_of_account_id' => $inventory->id, 'debit' => $purchase->total_amount, 'credit' => 0],
            ['chart_of_account_id' => $payable->id, 'debit' => 0, 'credit' => $purchase->total_amount],
        ];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $payable->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post(
            $purchase->purchase_date,
            "Purchase {$purchase->invoice_no}",
            $lines,
            'purchase',
            $purchase->id,
        );
    }

    /**
     * Weighted average cost must be computed from the stock quantity
     * *before* this purchase's increase is applied.
     *
     * @param  array<int, string>  $serialNumbers
     */
    private function receiveItem(Purchase $purchase, PurchaseItem $item, array $serialNumbers): void
    {
        /** @var Product $product */
        $product = $item->product;

        $newAvgCost = $product->current_stock <= 0
            ? $item->unit_price
            : (($product->current_stock * $product->avg_cost) + ($item->quantity * $item->unit_price))
                / ($product->current_stock + $item->quantity);

        $this->stock->increase($product, $item->quantity, StockMovementType::Purchase, 'purchase', $purchase->id, unitCost: $item->unit_price);

        $product->forceFill(['avg_cost' => round($newAvgCost, 2)])->save();

        if ($product->track_serial_number) {
            $this->createSerials($product, $item, $serialNumbers);
        }
    }

    /**
     * One in_stock serial_numbers row per unit received — every unit must
     * have its own serial when the product tracks them.
     *
     * @param  array<int, string>  $serialNumbers
     *
     * @throws InvalidSerialSelectionException
     */
    private function createSerials(Product $product, PurchaseItem $item, array $serialNumbers): void
    {
        $serialNumbers = array_values(array_unique($serialNumbers));

        if (count($serialNumbers) !== (int) $item->quantity) {
            throw new InvalidSerialSelectionException(
                "\"{$product->name}\" tracks serial numbers — expected {$item->quantity} unique serial(s), got ".count($serialNumbers).'.',
            );
        }

        foreach ($serialNumbers as $serialNumber) {
            if (SerialNumber::query()->where('product_id', $product->id)->where('serial_number', $serialNumber)->exists()) {
                throw new InvalidSerialSelectionException("Serial \"{$serialNumber}\" already exists for \"{$product->name}\".");
            }

            $item->serialNumbers()->create([
                'product_id' => $product->id,
                'serial_number' => $serialNumber,
                'status' => SerialNumberStatus::InStock,
            ]);
        }
    }
}
