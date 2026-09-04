<?php

namespace App\Models;

use App\Enums\AccountTransactionType;
use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    /** @use HasFactory<AccountFactory> */
    use HasFactory;

    /**
     * `current_balance` is deliberately not fillable — it may only change
     * through AccountService, alongside an account_transactions row.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'account_type_id',
        'account_sub_type',
        'account_number',
        'opening_balance',
        'is_active',
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
            'account_number' => 'encrypted',
            'opening_balance' => 'float',
            'current_balance' => 'float',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<AccountType, $this>
     */
    public function accountType(): BelongsTo
    {
        return $this->belongsTo(AccountType::class);
    }

    /**
     * @return HasMany<AccountTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(AccountTransaction::class);
    }

    /**
     * @param  Builder<Account>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * The one-off entry created when the account was opened, if any.
     */
    public function openingTransaction(): ?AccountTransaction
    {
        return $this->transactions()
            ->where('type', AccountTransactionType::OpeningBalance)
            ->first();
    }

    /**
     * Opening balance stays editable only while nothing else has happened
     * on the account — afterwards it must be corrected with an adjustment.
     */
    public function canEditOpeningBalance(): bool
    {
        return ! $this->transactions()
            ->where('type', '!=', AccountTransactionType::OpeningBalance)
            ->exists();
    }
}
