<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

/**
 * One page of a ledger that carries a running balance.
 *
 * A running balance needs everything before the page, but not as rows: the
 * sum of the rows ahead of the page is taken in the database, so memory and
 * time stay flat however long the ledger gets (10 years of one account).
 */
class LedgerPage
{
    public const PER_PAGE = 100;

    /**
     * @param  Builder<Model>  $ordered  the full, already-ordered, already-filtered ledger
     * @param  string  $signedExpression  SQL for one row's effect on the balance, e.g. "debit - credit"
     * @param  int|null  $requestedPage  null opens the last page — where the newest activity is
     * @return array{rows: Collection<int, Model>, openingBalance: float, pagination: array{current_page: int, last_page: int, total: int, from: int|null, to: int|null}}
     */
    public static function of(Builder|Relation $ordered, string $signedExpression, float $broughtForward, ?int $requestedPage): array
    {
        $total = (clone $ordered)->toBase()->getCountForPagination();
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min(max($requestedPage ?? $lastPage, 1), $lastPage);
        $offset = ($page - 1) * self::PER_PAGE;

        $rows = (clone $ordered)->forPage($page, self::PER_PAGE)->get();

        return [
            'rows' => $rows,
            'openingBalance' => $broughtForward + self::sumBefore($ordered, $signedExpression, $offset),
            'pagination' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'total' => $total,
                'from' => $rows->isEmpty() ? null : $offset + 1,
                'to' => $rows->isEmpty() ? null : $offset + $rows->count(),
            ],
        ];
    }

    /**
     * @param  Builder<Model>  $ordered
     */
    public static function sumBefore(Builder|Relation $ordered, string $signedExpression, int $offset): float
    {
        if ($offset <= 0) {
            return 0.0;
        }

        $slice = (clone $ordered)->select(DB::raw("{$signedExpression} as signed_amount"))->limit($offset);

        return (float) DB::query()->fromSub($slice, 'ledger_slice')->sum('signed_amount');
    }
}
