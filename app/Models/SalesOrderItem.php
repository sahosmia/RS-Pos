<?php

namespace App\Models;

use App\Enums\DiscountType;
use Database\Factories\SalesOrderItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderItem extends Model
{
    /** @use HasFactory<SalesOrderItemFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sales_order_id',
        'product_id',
        'quantity',
        'original_price',
        'unit_price',
        'discount_type',
        'discount_value',
        'discount_amount',
        'subtotal',
        'installation_required',
        'installation_charge',
        'emi_financed',
        'warranty_months',
        'service_plan_included',
        'note',
        'serial_numbers',
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
            'discount_type' => DiscountType::class,
            'discount_value' => 'float',
            'discount_amount' => 'float',
            'subtotal' => 'float',
            'installation_required' => 'boolean',
            'installation_charge' => 'float',
            'emi_financed' => 'boolean',
            'warranty_months' => 'integer',
            'service_plan_included' => 'boolean',
            'serial_numbers' => 'array',
        ];
    }

    /**
     * @return BelongsTo<SalesOrder, $this>
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
