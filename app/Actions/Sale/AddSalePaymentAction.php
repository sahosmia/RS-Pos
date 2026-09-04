<?php

namespace App\Actions\Sale;

use App\Enums\AccountTransactionType;
use App\Enums\ContactLedgerType;
use App\Models\Sale;
use App\Services\AccountService;
use App\Services\LedgerService;
use Illuminate\Support\Facades\DB;

/**
 * Settles more of an already-Confirmed sale's due — separate from
 * confirming it, no stock effect.
 */
class AddSalePaymentAction
{
    public function __construct(
        private AccountService $accounts,
        private LedgerService $ledger,
    ) {}

    /**
     * @param  array<int, array{account_id: int|string, amount: float|string}>  $payments
     */
    public function execute(Sale $sale, array $payments): Sale
    {
        return DB::transaction(function () use ($sale, $payments) {
            $sale->loadMissing('customer');

            $paidViaAccounts = $this->accounts->recordSplitPayment(
                $payments,
                AccountTransactionType::SalePayment,
                today(),
                'sale',
                $sale->id,
            );

            $this->ledger->recordContact($sale->customer, ContactLedgerType::PaymentReceived, -$paidViaAccounts, 'sale', $sale->id);

            $sale->recalculatePaymentTotals();

            return $sale->fresh();
        });
    }
}
