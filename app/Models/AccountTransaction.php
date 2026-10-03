<?php

namespace App\Models;

use App\Enums\AccountTransactionType;
use App\Models\Concerns\HasCreator;
use Database\Factories\AccountTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountTransaction extends Model
{
    /** @use HasFactory<AccountTransactionFactory> */
    use HasFactory;

    use HasCreator;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'account_id',
        'type',
        'amount',
        'reference_type',
        'reference_id',
        'operation_date',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => AccountTransactionType::class,
            'amount' => 'float',
            'operation_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
