<?php

namespace App\Actions\SalesOrder;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\SalesOrderStatus;
use App\Models\Account;
use App\Models\SalesOrder;
use App\Models\Settings;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Books an advance order — no stock movement (see SalesOrder docblock). An
 * optional advance payment does move Accounts/Contact ledger/the General
 * Ledger, exactly like a Sale payment, just against the Customer Advances
 * liability (2150) instead of Accounts Receivable, since the shop now owes
 * goods or a refund rather than being owed cash.
 */
class CreateSalesOrderAction
{
    public function __construct(
        private AccountService $accounts,
        private LedgerService $ledger,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{customer_id: int, order_date: string, expected_delivery_date?: string|null, items: array<int, array{product_id: int, quantity: float|string, unit_price: float|string}>, payments?: array<int, array{account_id: int|string, amount: float|string}>}  $data
     */
    public function execute(array $data): SalesOrder
    {
        return DB::transaction(function () use ($data) {
            $order = SalesOrder::create([
                'customer_id' => $data['customer_id'],
                'order_no' => Settings::current()->generateSalesOrderNumber(),
                'order_date' => $data['order_date'],
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'status' => SalesOrderStatus::Pending,
                'created_by' => Auth::id(),
            ]);

            $totalAmount = 0.0;

            foreach ($data['items'] as $item) {
                $quantity = round((float) $item['quantity'], 2);
                $unitPrice = round((float) $item['unit_price'], 2);
                $subtotal = round($quantity * $unitPrice, 2);

                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $totalAmount += $subtotal;
            }

            $order->forceFill(['total_amount' => round($totalAmount, 2)])->save();

            $payments = $data['payments'] ?? [];

            if ($payments !== []) {
                $order->load('customer');

                $advanceAmount = $this->accounts->recordSplitPayment(
                    $payments,
                    AccountTransactionType::SalesOrderAdvance,
                    $order->order_date,
                    'sales_order',
                    $order->id,
                );

                // Company now "owes" the customer (goods, or a refund) —
                // negative per the sign convention (পর্ব ০.৩).
                $this->ledger->recordContact($order->customer, ContactLedgerType::SalesOrderAdvance, -$advanceAmount, 'sales_order', $order->id);

                $this->postAdvanceJournal($order, $payments, round($advanceAmount, 2));

                $order->forceFill([
                    'advance_paid' => round($advanceAmount, 2),
                    'status' => SalesOrderStatus::Partial,
                ])->save();
            }

            return $order->fresh(['items.product', 'customer']);
        });
    }

    /**
     * One Dr {paying account} / Cr Customer Advances line pair per account —
     * same shape as the payment lines ConfirmSaleAction posts, just against
     * the liability account since no receivable exists yet.
     *
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    private function postAdvanceJournal(SalesOrder $order, array $payments, float $totalAmount): void
    {
        $customerAdvances = $this->chartOfAccounts->code('2150');
        $lines = [];

        foreach ($payments as $payment) {
            $amount = round((float) $payment['amount'], 2);
            $account = Account::findOrFail($payment['account_id']);

            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0];
            $lines[] = ['chart_of_account_id' => $customerAdvances->id, 'debit' => 0, 'credit' => $amount];
        }

        $this->journal->post($order->order_date, "Advance for sales order {$order->order_no}", $lines, 'sales_order', $order->id);
    }
}
