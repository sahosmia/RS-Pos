<?php

namespace App\Models;

use App\Enums\OtherLiabilityTransactionType;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasLedger;
use Database\Factories\OtherLiabilityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A catch-all liability entity for debts that don't fit Company Loan,
 * Supplier due, or Expense due — same cached-balance + immutable-
 * transaction pattern as Asset, but a mirror-image one: increases grow the
 * liability rather than value.
 */
class OtherLiability extends Model
{
    /** @use HasFactory<OtherLiabilityFactory> */
    use HasFactory;

    use HasLedger;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'opening_amount',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'opening_amount' => 'float',
            'current_balance' => 'float',
        ];
    }

    /**
     * @return HasMany<OtherLiabilityTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(OtherLiabilityTransaction::class);
    }

    protected function ledgerBalanceColumn(): string
    {
        return 'current_balance';
    }

    /**
     * The opening entry stays correctable only while nothing else has
     * happened to this liability — same rule as Account's opening balance.
     */
    public function canEditOpeningAmount(): bool
    {
        return ! $this->transactions()
            ->where('type', '!=', OtherLiabilityTransactionType::OpeningLiability)
            ->exists();
    }

    public function openingTransaction(): ?OtherLiabilityTransaction
    {
        return $this->transactions()
            ->where('type', OtherLiabilityTransactionType::OpeningLiability)
            ->first();
    }
}
