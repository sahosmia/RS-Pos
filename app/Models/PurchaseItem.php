<?php

namespace App\Models;

use Database\Factories\PurchaseItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseItem extends Model
{
    /** @use HasFactory<PurchaseItemFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'purchase_id',
        'product_id',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_price' => 'float',
            'subtotal' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Purchase, $this>
     */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The specific units this line item brought into stock — set at
     * receive/confirm time for a track_serial_number product.
     *
     * @return HasMany<SerialNumber, $this>
     */
    public function serialNumbers(): HasMany
    {
        return $this->hasMany(SerialNumber::class);
    }

    /**
     * @return HasMany<PurchaseReturnItem, $this>
     */
    public function returnItems(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }
}
