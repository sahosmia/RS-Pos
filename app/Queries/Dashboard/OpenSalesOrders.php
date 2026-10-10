<?php

namespace App\Queries\Dashboard;

use App\Enums\SalesOrderStatus;
use App\Models\SalesOrder;

/**
 * The dashboard's "Sales Orders waiting" card: orders booked but not yet confirmed as a sale. Null when there are none,
 * so the card simply does not appear.
 */
class OpenSalesOrders
{
    private const LIST_SIZE = 6;

    /**
     * @return array{count: int, total: float, advance: float, items: list<array<string, mixed>>}|null
     */
    public static function get(): ?array
    {
        $open = fn () => SalesOrder::query()->whereIn('status', [SalesOrderStatus::Pending, SalesOrderStatus::Partial]);

        $count = $open()->count();

        if ($count === 0) {
            return null;
        }

        return [
            'count' => $count,
            'total' => round((float) $open()->sum('total_amount'), 2),
            'advance' => round((float) $open()->sum('advance_paid'), 2),
            'items' => $open()
                ->with('customer:id,name')
                ->orderByRaw('expected_delivery_date IS NULL')
                ->orderBy('expected_delivery_date')
                ->orderBy('order_date')
                ->limit(self::LIST_SIZE)
                ->get()
                ->map(fn (SalesOrder $order) => [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'customer' => $order->customer->name,
                    'expected_delivery_date' => $order->expected_delivery_date?->toDateString(),
                    'total_amount' => $order->total_amount,
                    'due_amount' => round($order->total_amount - $order->advance_paid, 2),
                ])
                ->all(),
        ];
    }
}
