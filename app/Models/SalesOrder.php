<?php

namespace App\Models;

use App\Enums\SalesOrderStatus;
use Database\Factories\SalesOrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * An advance booking/reservation — not a confirmed sale, so it never touches
 * stock_movements. `total_amount`/`advance_paid` only ever move through
 * CreateSalesOrderAction; `status` also moves through
 * ConvertSalesOrderToSaleAction (→ completed) and a future cancel action.
 */
class SalesOrder extends Model
{
    /** @use HasFactory<SalesOrderFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'customer_id',
        'order_no',
        'order_date',
        'expected_delivery_date',
        'status',
        'total_amount',
        'advance_paid',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order_date' => 'date',
            'expected_delivery_date' => 'date',
            'status' => SalesOrderStatus::class,
            'total_amount' => 'float',
            'advance_paid' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * @return HasMany<SalesOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    /**
     * The real Sale created on fulfillment — null until converted.
     *
     * @return HasOne<Sale, $this>
     */
    public function sale(): HasOne
    {
        return $this->hasOne(Sale::class);
    }

    /**
     * A pending/partial order (advance may or may not have been taken) can
     * still be converted or cancelled; a completed/cancelled one cannot.
     */
    public function canConvert(): bool
    {
        return in_array($this->status, [SalesOrderStatus::Pending, SalesOrderStatus::Partial], true);
    }
}
