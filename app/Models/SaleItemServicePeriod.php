<?php

namespace App\Models;

use Database\Factories\SaleItemServicePeriodFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One period of a sold unit's free-service schedule, snapshotted from
 * ServicePlanTemplate at sale-confirm time (see ConfirmSaleAction) — never
 * touched by later template edits. No carry-over: an unused free service in
 * one period is lost once that period ends.
 */
class SaleItemServicePeriod extends Model
{
    /** @use HasFactory<SaleItemServicePeriodFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sale_item_id',
        'period_number',
        'period_months',
        'free_quota',
        'period_start_date',
        'period_end_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_number' => 'integer',
            'period_months' => 'integer',
            'free_quota' => 'integer',
            'period_start_date' => 'date',
            'period_end_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<SaleItem, $this>
     */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function isCurrent(): bool
    {
        $today = Carbon::today();

        return ! $this->period_start_date->gt($today) && $this->period_end_date->gt($today);
    }

    /**
     * How many free `service` requests have already been used inside this
     * exact period.
     */
    public function usedFreeCount(): int
    {
        return $this->saleItem->serviceRequests()
            ->where('type', 'service')
            ->where('is_free', true)
            ->whereBetween('service_date', [$this->period_start_date, $this->period_end_date])
            ->count();
    }

    public function freeQuotaRemaining(): int
    {
        return max(0, $this->free_quota - $this->usedFreeCount());
    }
}
