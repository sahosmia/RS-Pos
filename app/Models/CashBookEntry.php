<?php

namespace App\Models;

use App\Enums\CashBookEntryType;
use Database\Factories\CashBookEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashBookEntry extends Model
{
    /** @use HasFactory<CashBookEntryFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'category_id',
        'amount',
        'note',
        'entry_date',
        'created_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CashBookEntryType::class,
            'amount' => 'float',
            'entry_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<MiscTransactionCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(MiscTransactionCategory::class, 'category_id');
    }
}
