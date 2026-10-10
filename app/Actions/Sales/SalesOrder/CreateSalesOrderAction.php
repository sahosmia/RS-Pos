<?php

namespace App\Actions\Sales\SalesOrder;

use App\Actions\Sales\Sale\SaleTotals;
use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Enums\DiscountType;
use App\Enums\SalesOrderStatus;
use App\Models\Account;
use App\Models\SalesOrder;
use App\Models\Settings;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use App\Services\LedgerService;
use App\Support\EmiTerms;
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
            $discountType = isset($data['discount_type']) ? DiscountType::from($data['discount_type']) : null;

            $order = SalesOrder::create([
                'customer_id' => $data['customer_id'],
                'order_no' => Settings::current()->generateSalesOrderNumber(),
                'order_date' => $data['order_date'],
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'status' => SalesOrderStatus::Pending,
                'discount_type' => $discountType,
                'discount_value' => $discountType !== null ? ($data['discount_value'] ?? 0) : 0,
                ...EmiTerms::columns($data),
                'created_by' => Auth::id(),
            ]);

            // Same pricing as a Sale: per-line discount, installation charges, then the invoice discount on top.
            $priced = SaleTotals::priceLines($data['items']);

            foreach ($priced['rows'] as $index => $row) {
                $order->items()->create([...$row, 'serial_numbers' => $this->serials($data['items'][$index] ?? [])]);
            }

            $totals = SaleTotals::totalsFor($priced['subtotal'], $priced['installation'], $discountType, (float) $order->discount_value);

            $order->forceFill([
                'subtotal' => $totals->subtotal,
                'discount_amount' => $totals->discountAmount,
                'installation_amount' => $totals->installationAmount,
                'total_amount' => $totals->totalAmount,
            ])->save();

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
     * The serial numbers planned for a line (checked against real stock when the order is converted to a sale).
     *
     * @param  array<string, mixed>  $item
     * @return list<string>|null
     */
    private function serials(array $item): ?array
    {
        $serials = array_values(array_filter(array_map(fn ($serial) => trim((string) $serial), $item['serial_numbers'] ?? []), fn (string $serial) => $serial !== ''));

        return $serials === [] ? null : $serials;
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
