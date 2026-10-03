<?php

namespace App\Models;

use App\Enums\WarrantyClaimStatus;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\WarrantyClaimFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarrantyClaim extends Model
{
    /** @use HasFactory<WarrantyClaimFactory> */
    use HasFactory;

    use HasCreator;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sale_item_id',
        'claim_date',
        'issue_description',
        'status',
        'resolution_note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'claim_date' => 'date',
            'status' => WarrantyClaimStatus::class,
        ];
    }

    /**
     * @return BelongsTo<SaleItem, $this>
     */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }
}
