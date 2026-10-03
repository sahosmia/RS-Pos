<?php

namespace App\Models;

use App\Enums\InvestorTransactionType;
use App\Models\Concerns\HasCreator;
use Database\Factories\InvestorTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestorTransaction extends Model
{
    /** @use HasFactory<InvestorTransactionFactory> */
    use HasFactory;

    use HasCreator;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'investor_id',
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
            'type' => InvestorTransactionType::class,
            'amount' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Investor, $this>
     */
    public function investor(): BelongsTo
    {
        return $this->belongsTo(Investor::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
