<?php

namespace App\Support;

use App\Enums\AccountTransactionType;
use App\Models\AccountTransaction;
use App\Models\Sale;
use Illuminate\Support\Collection;

/**
 * There's no dedicated "sale payments" table — every payment against a sale
 * (the down payment at confirm time, any later top-up via
 * `AddSalePaymentAction`) and every refund against one of its returns (via
 * `RefundSaleReturnAction`) is an `AccountTransaction` row, tagged
 * `reference_type: 'sale'`/`'sale_return'` respectively. This is the one
 * place both kinds are read back and merged into a single, date-ordered
 * money trail for a sale — shared by the Sales list's "View Payments" modal
 * and the sale detail page's own Payment History section, so the two can
 * never drift apart.
 */
class SalePaymentHistory
{
    /**
     * @return Collection<int, array{id: int, date: string, account: string, amount: float, kind: 'payment'|'refund'}>
     */
    public static function forSale(Sale $sale): Collection
    {
        $payments = AccountTransaction::query()
            ->where('reference_type', 'sale')
            ->where('reference_id', $sale->id)
            ->where('type', AccountTransactionType::SalePayment)
            ->with('account:id,name')
            ->get()
            ->map(fn (AccountTransaction $transaction) => self::row($transaction, 'payment'));

        $returnIds = $sale->returns()->pluck('id');

        $refunds = AccountTransaction::query()
            ->where('reference_type', 'sale_return')
            ->whereIn('reference_id', $returnIds)
            ->where('type', AccountTransactionType::SaleReturnRefund)
            ->with('account:id,name')
            ->get()
            ->map(fn (AccountTransaction $transaction) => self::row($transaction, 'refund'));

        return $payments->concat($refunds)
            ->sortBy([['date', 'asc'], ['id', 'asc']])
            ->values();
    }

    /**
     * @return array{id: int, date: string, account: string, amount: float, kind: 'payment'|'refund'}
     */
    private static function row(AccountTransaction $transaction, string $kind): array
    {
        return [
            'id' => $transaction->id,
            'date' => $transaction->operation_date->toDateString(),
            'account' => $transaction->account->name,
            'amount' => abs((float) $transaction->amount),
            'kind' => $kind,
        ];
    }
}
