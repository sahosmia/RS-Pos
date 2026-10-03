<?php

namespace App\Models;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\Concerns\HasCreator;
use Database\Factories\OtherLiabilityTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtherLiabilityTransaction extends Model
{
    /** @use HasFactory<OtherLiabilityTransactionFactory> */
    use HasFactory;

    use HasCreator;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'other_liability_id',
        'type',
        'amount',
        'account_id',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => OtherLiabilityTransactionType::class,
            'amount' => 'float',
        ];
    }

    /**
     * @return BelongsTo<OtherLiability, $this>
     */
    public function otherLiability(): BelongsTo
    {
        return $this->belongsTo(OtherLiability::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
