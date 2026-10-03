<?php

namespace App\Models;

use App\Enums\ServiceRequestStatus;
use App\Enums\ServiceRequestType;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ServiceRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRequest extends Model
{
    /** @use HasFactory<ServiceRequestFactory> */
    use HasFactory;

    use HasCreator;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sale_item_id',
        'request_date',
        'service_date',
        'type',
        'is_free',
        'charge_amount',
        'account_id',
        'staff_id',
        'status',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'request_date' => 'date',
            'service_date' => 'date',
            'type' => ServiceRequestType::class,
            'is_free' => 'boolean',
            'charge_amount' => 'float',
            'status' => ServiceRequestStatus::class,
        ];
    }

    /**
     * @return BelongsTo<SaleItem, $this>
     */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
