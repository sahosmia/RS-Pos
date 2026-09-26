<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ServicePlanTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One period in a product's free-service schedule (e.g. AC: period 1 = 12
 * months/quota 2, period 2 = 12 months/quota 0) — snapshotted per sale into
 * SaleItemServicePeriod so later edits here never affect units already sold.
 */
class ServicePlanTemplate extends Model
{
    /** @use HasFactory<ServicePlanTemplateFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'product_id',
        'period_number',
        'period_months',
        'free_quota',
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
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
