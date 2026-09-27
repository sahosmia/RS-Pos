<?php

namespace App\Models;

use Database\Factories\SaleItemFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    /** @use HasFactory<SaleItemFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sale_id',
        'product_id',
        'quantity',
        'original_price',
        'unit_price',
        'discount_amount',
        'cost_at_sale',
        'subtotal',
        'installation_required',
        'installation_charge',
        'warranty_expires_at',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'original_price' => 'float',
            'unit_price' => 'float',
            'discount_amount' => 'float',
            'cost_at_sale' => 'float',
            'subtotal' => 'float',
            'installation_required' => 'boolean',
            'installation_charge' => 'float',
            'warranty_expires_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Sale, $this>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The specific units sold against this line — set at confirm time.
     *
     * @return HasMany<SerialNumber, $this>
     */
    public function serialNumbers(): HasMany
    {
        return $this->hasMany(SerialNumber::class);
    }

    /**
     * @return HasMany<SaleReturnItem, $this>
     */
    public function returnItems(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }

    /**
     * This sold unit's free-service schedule, snapshotted from the
     * product's ServicePlanTemplate rows at confirm time.
     *
     * @return HasMany<SaleItemServicePeriod, $this>
     */
    public function servicePeriods(): HasMany
    {
        return $this->hasMany(SaleItemServicePeriod::class);
    }

    /**
     * @return HasMany<ServiceRequest, $this>
     */
    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }

    /**
     * @return HasMany<WarrantyClaim, $this>
     */
    public function warrantyClaims(): HasMany
    {
        return $this->hasMany(WarrantyClaim::class);
    }

    /**
     * The service period covering today, if any — null once the whole
     * plan has run out (every period ended) or if this product never had
     * one to begin with.
     */
    public function currentServicePeriod(): ?SaleItemServicePeriod
    {
        return $this->servicePeriods()
            ->where('period_start_date', '<=', now())
            ->where('period_end_date', '>', now())
            ->first();
    }

    /**
     * Whether the *next* `service`-type request against this unit qualifies
     * free, per পর্ব ১০ — installation never counts here, and a plan that's
     * fully lapsed (no current period) is always paid.
     */
    public function isNextServiceFree(): bool
    {
        $period = $this->currentServicePeriod();

        return $period !== null && $period->freeQuotaRemaining() > 0;
    }

    /**
     * `(unit_price - cost_at_sale) × quantity` — cost_at_sale is a snapshot,
     * so this stays accurate even after avg_cost later changes.
     *
     * @return Attribute<float, never>
     */
    protected function profit(): Attribute
    {
        return Attribute::make(
            get: fn () => round(($this->unit_price - $this->cost_at_sale) * $this->quantity, 2),
        );
    }
}
