<?php

namespace App\Queries\Dashboard;

use App\Enums\EmiInstallmentStatus;
use App\Enums\SaleStatus;
use App\Models\EmiInstallment;
use App\Models\SaleItem;
use Illuminate\Support\Carbon;

/**
 * The dashboard's "needs attention today" lists: installments that are overdue or fall due this week, and
 * warranties running out soon. Small, capped lists with the real totals alongside, so a busy shop sees what to
 * chase first without opening three reports.
 */
class FollowUps
{
    private const LIST_SIZE = 6;

    /** Installments due within this many days count as "due soon". */
    private const DUE_SOON_DAYS = 7;

    private const WARRANTY_DAYS = 30;

    /**
     * @return array{emi: array<string, mixed>|null, warranties: array<string, mixed>}
     */
    public static function get(bool $emiEnabled, ?Carbon $today = null): array
    {
        $today ??= today();

        return [
            'emi' => $emiEnabled ? self::installments($today) : null,
            'warranties' => self::warranties($today),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function installments(Carbon $today): array
    {
        $open = fn () => EmiInstallment::query()
            ->whereIn('status', [EmiInstallmentStatus::Pending, EmiInstallmentStatus::Overdue])
            ->whereHas('sale', fn ($query) => $query->where('status', SaleStatus::Confirmed))
            ->whereDate('due_date', '<=', $today->copy()->addDays(self::DUE_SOON_DAYS));

        $remaining = fn ($rows) => round((float) $rows->sum(fn (EmiInstallment $row) => max(0.0, $row->amount - $row->paid_amount)), 2);

        $all = $open()->get(['id', 'sale_id', 'installment_number', 'due_date', 'amount', 'paid_amount']);
        $overdue = $all->filter(fn (EmiInstallment $row) => $row->due_date->lt($today));

        $items = $open()
            ->with('sale:id,invoice_no,customer_id', 'sale.customer:id,name,phone')
            ->orderBy('due_date')
            ->limit(self::LIST_SIZE)
            ->get()
            ->map(fn (EmiInstallment $row) => [
                'id' => $row->id,
                'sale_id' => $row->sale_id,
                'invoice_no' => $row->sale->invoice_no,
                'customer' => $row->sale->customer->name,
                'phone' => $row->sale->customer->phone,
                'number' => $row->installment_number,
                'due_date' => $row->due_date->toDateString(),
                'remaining' => round(max(0.0, $row->amount - $row->paid_amount), 2),
                'overdue' => $row->due_date->lt($today),
            ])
            ->all();

        return [
            'overdue_count' => $overdue->count(),
            'overdue_amount' => $remaining($overdue),
            'due_soon_count' => $all->count() - $overdue->count(),
            'due_soon_amount' => round($remaining($all) - $remaining($overdue), 2),
            'items' => $items,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function warranties(Carbon $today): array
    {
        $expiring = fn () => SaleItem::query()
            ->whereNotNull('warranty_expires_at')
            ->whereDate('warranty_expires_at', '>=', $today)
            ->whereDate('warranty_expires_at', '<=', $today->copy()->addDays(self::WARRANTY_DAYS))
            ->whereHas('sale', fn ($query) => $query->where('status', SaleStatus::Confirmed));

        $items = $expiring()
            ->with('product:id,name', 'sale:id,invoice_no,customer_id', 'sale.customer:id,name,phone')
            ->orderBy('warranty_expires_at')
            ->limit(self::LIST_SIZE)
            ->get()
            ->map(fn (SaleItem $item) => [
                'id' => $item->id,
                'sale_id' => $item->sale_id,
                'invoice_no' => $item->sale->invoice_no,
                'product' => $item->product->name,
                'customer' => $item->sale->customer->name,
                'phone' => $item->sale->customer->phone,
                'expires_on' => $item->warranty_expires_at->toDateString(),
            ])
            ->all();

        return ['count' => $expiring()->count(), 'items' => $items];
    }
}
