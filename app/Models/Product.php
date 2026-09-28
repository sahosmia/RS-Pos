<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Product extends Model implements HasMedia
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    use InteractsWithMedia;
    use LogsActivityDefaults;

    /**
     * `avg_cost` and `current_stock` are deliberately not fillable — they
     * may only change through StockService, alongside a stock_movements row.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'sku',
        'barcode',
        'category_id',
        'brand_id',
        'unit_id',
        'selling_price',
        'minimum_stock_level',
        'manage_stock',
        'is_for_sale',
        'is_active',
        'warranty_period_months',
        'has_installation_service',
        'emi_available',
        'track_serial_number',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'avg_cost' => 'float',
            'selling_price' => 'float',
            'current_stock' => 'float',
            'minimum_stock_level' => 'float',
            'manage_stock' => 'boolean',
            'is_for_sale' => 'boolean',
            'is_active' => 'boolean',
            'has_installation_service' => 'boolean',
            'emi_available' => 'boolean',
            'track_serial_number' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * @return HasMany<SaleItem, $this>
     */
    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * @return HasMany<PurchaseItem, $this>
     */
    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    /**
     * @return HasMany<SerialNumber, $this>
     */
    public function serialNumbers(): HasMany
    {
        return $this->hasMany(SerialNumber::class);
    }

    /**
     * This product's free-service schedule (পর্ব ১০) — snapshotted into
     * SaleItemServicePeriod at confirm time, so editing this afterward
     * never changes units already sold.
     *
     * @return HasMany<ServicePlanTemplate, $this>
     */
    public function servicePlanTemplates(): HasMany
    {
        return $this->hasMany(ServicePlanTemplate::class)->orderBy('period_number');
    }

    /**
     * 'low_stock' / 'in_stock' / 'out_of_stock' — display-only, derived from
     * the cached quantity columns.
     *
     * @return Attribute<string, never>
     */
    protected function stockStatus(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->current_stock <= 0
                ? 'out_of_stock'
                : ($this->current_stock <= $this->minimum_stock_level ? 'low_stock' : 'in_stock'),
        );
    }

    /**
     * Display-only profit margin percentage between avg_cost and selling_price.
     *
     * @return Attribute<float, never>
     */
    protected function profitMargin(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->selling_price > 0
                ? round((($this->selling_price - $this->avg_cost) / $this->selling_price) * 100, 2)
                : 0.0,
        );
    }

    /**
     * SKU is optional on the create form — an admin who doesn't care to pick
     * one yet gets a short, unique placeholder instead of a blank/duplicate value.
     */
    public static function generateUniqueSku(): string
    {
        do {
            $sku = 'SKU-'.strtoupper(Str::random(6));
        } while (static::query()->where('sku', $sku)->exists());

        return $sku;
    }

    /**
     * Opening stock stays settable only until the first stock movement is
     * recorded (the opening entry itself included) — afterwards it must be
     * corrected with a Stock Adjustment.
     */
    public function canSetOpeningStock(): bool
    {
        return ! $this->stockMovements()->exists();
    }

    /**
     * Re-calculates and saves current_stock from all stock_movements for this product.
     */
    public function recalculateStock(): void
    {
        $movements = $this->stockMovements()->get();
        $total = 0.0;

        foreach ($movements as $movement) {
            if ($movement->type->increasesStock()) {
                $total += $movement->quantity;
            } else {
                $total -= $movement->quantity;
            }
        }

        $this->forceFill([
            'current_stock' => round($total, 2),
        ])->save();
    }

    /**
     * A single product photo — no custom column, just the package's
     * polymorphic `media` table.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }
}
