<?php

namespace App\Queries\EmiInstallment;

use App\Enums\AccountTransactionType;
use App\Enums\EmiInstallmentStatus;
use App\Models\AccountTransaction;
use App\Models\EmiInstallment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * "How much EMI money is coming in?" — expected vs collected vs still owed, bucketed by week, month or year.
 *
 * - **Expected**: installments whose due date falls in the bucket (cancelled ones excluded).
 * - **Collected**: cash actually received in the bucket — `emi_payment` account transactions by their
 *   operation date, so a payment counts in the week it was taken, not the week the installment was due.
 * - **Remaining**: the unpaid part of that bucket's installments; **overdue** is the part of it already past due.
 *
 * Grouping is done in PHP over a bounded date window (at most 12 buckets), which keeps it portable across
 * MySQL and SQLite and avoids per-driver date functions.
 */
class EmiCollectionSummary
{
    public const GROUPS = ['week', 'month', 'year'];

    /**
     * @return array{group: string, year: int, rows: list<array{key: string, label: string, from: string, to: string, expected: float, collected: float, remaining: float, overdue: float, is_current: bool}>, totals: array{expected: float, collected: float, remaining: float, overdue: float}}
     */
    public static function forGroup(string $group, ?int $year = null, ?CarbonImmutable $now = null): array
    {
        $today = ($now ?? CarbonImmutable::now())->startOfDay();
        $year ??= $today->year;

        $buckets = self::buckets($group, $year, $today);
        $from = $buckets->first()['from'];
        $to = $buckets->last()['to'];

        $installments = EmiInstallment::query()
            ->where('status', '!=', EmiInstallmentStatus::Cancelled->value)
            ->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
            ->get(['due_date', 'amount', 'paid_amount']);

        $payments = AccountTransaction::query()
            ->where('type', AccountTransactionType::EmiPayment->value)
            ->whereBetween('operation_date', [$from->toDateString(), $to->toDateString()])
            ->get(['operation_date', 'amount']);

        $rows = $buckets->map(function (array $bucket) use ($installments, $payments, $today) {
            $due = $installments->filter(fn (EmiInstallment $i) => self::within($i->due_date, $bucket));
            $remainingOf = fn (EmiInstallment $i) => max(0.0, round($i->amount - $i->paid_amount, 2));

            return [
                'key' => $bucket['key'],
                'label' => $bucket['label'],
                'from' => $bucket['from']->toDateString(),
                'to' => $bucket['to']->toDateString(),
                'expected' => round($due->sum('amount'), 2),
                'collected' => round($payments->filter(fn (AccountTransaction $p) => self::within($p->operation_date, $bucket))->sum('amount'), 2),
                'remaining' => round($due->sum($remainingOf), 2),
                'overdue' => round($due->filter(fn (EmiInstallment $i) => $i->due_date->lt($today))->sum($remainingOf), 2),
                'is_current' => $today->between($bucket['from'], $bucket['to']),
            ];
        })->values();

        return [
            'group' => $group,
            'year' => $year,
            'rows' => $rows->all(),
            'totals' => [
                'expected' => round($rows->sum('expected'), 2),
                'collected' => round($rows->sum('collected'), 2),
                'remaining' => round($rows->sum('remaining'), 2),
                'overdue' => round($rows->sum('overdue'), 2),
            ],
        ];
    }

    /**
     * The headline numbers above the breakdown, independent of the chosen grouping.
     *
     * @return array{overdue: float, due_this_week: float, due_this_month: float, collected_this_month: float}
     */
    public static function headline(?CarbonImmutable $now = null): array
    {
        $today = ($now ?? CarbonImmutable::now())->startOfDay();
        $open = EmiInstallment::query()->where('status', '!=', EmiInstallmentStatus::Cancelled->value)->where('status', '!=', EmiInstallmentStatus::Paid->value);

        $remaining = fn ($query) => round((float) $query->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')->value('total'), 2);

        return [
            'overdue' => $remaining((clone $open)->whereDate('due_date', '<', $today->toDateString())),
            'due_this_week' => $remaining((clone $open)->whereBetween('due_date', [$today->startOfWeek()->toDateString(), $today->endOfWeek()->toDateString()])),
            'due_this_month' => $remaining((clone $open)->whereBetween('due_date', [$today->startOfMonth()->toDateString(), $today->endOfMonth()->toDateString()])),
            'collected_this_month' => round((float) AccountTransaction::query()
                ->where('type', AccountTransactionType::EmiPayment->value)
                ->whereBetween('operation_date', [$today->startOfMonth()->toDateString(), $today->endOfMonth()->toDateString()])
                ->sum('amount'), 2),
        ];
    }

    /**
     * @return Collection<int, array{key: string, label: string, from: CarbonImmutable, to: CarbonImmutable}>
     */
    private static function buckets(string $group, int $year, CarbonImmutable $today): Collection
    {
        return match ($group) {
            // 4 weeks back, this week, 7 weeks ahead — what was collected recently and what is about to fall due.
            'week' => collect(range(-4, 7))->map(function (int $offset) use ($today) {
                $start = $today->startOfWeek()->addWeeks($offset);

                return ['key' => $start->toDateString(), 'label' => $start->format('j M').' – '.$start->endOfWeek()->format('j M'), 'from' => $start, 'to' => $start->endOfWeek()->startOfDay()];
            }),
            'year' => collect(range($today->year - 2, $today->year + 3))->map(fn (int $y) => [
                'key' => (string) $y, 'label' => (string) $y, 'from' => CarbonImmutable::create($y, 1, 1), 'to' => CarbonImmutable::create($y, 12, 31),
            ]),
            default => collect(range(1, 12))->map(function (int $month) use ($year) {
                $start = CarbonImmutable::create($year, $month, 1);

                return ['key' => $start->format('Y-m'), 'label' => $start->format('M Y'), 'from' => $start, 'to' => $start->endOfMonth()->startOfDay()];
            }),
        };
    }

    /**
     * @param  array{from: CarbonImmutable, to: CarbonImmutable}  $bucket
     */
    private static function within(mixed $date, array $bucket): bool
    {
        $day = CarbonImmutable::parse($date)->startOfDay();

        return $day->gte($bucket['from']) && $day->lte($bucket['to']);
    }
}
