<?php

namespace App\Models;

use App\Enums\InvestorTransactionType;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasLedger;
use Database\Factories\InvestorFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * `total_invested` only ever moves through
 * HasLedger::addLedgerTransaction() — grows on investment, shrinks on
 * withdrawal, untouched by profit_share (see InvestorTransactionType).
 */
class Investor extends Model
{
    use HasCreator;

    /** @use HasFactory<InvestorFactory> */
    use HasFactory;

    use HasLedger;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'note',
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
            'total_invested' => 'float',
        ];
    }

    /**
     * The opening entry stays correctable only while nothing else has
     * happened to this investor — same rule as OtherLiability's opening amount.
     */
    public function canEditOpeningAmount(): bool
    {
        return ! $this->transactions()
            ->where('type', '!=', InvestorTransactionType::OpeningBalance)
            ->exists();
    }

    public function openingTransaction(): ?InvestorTransaction
    {
        return $this->transactions()
            ->where('type', InvestorTransactionType::OpeningBalance)
            ->first();
    }

    /**
     * @return HasMany<InvestorTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(InvestorTransaction::class);
    }

    protected function ledgerBalanceColumn(): string
    {
        return 'total_invested';
    }

    /**
     * Why this record can't be deleted, or null when it can — one rule for the single and the bulk delete.
     */
    public function deletionBlockReason(): ?string
    {
        return $this->transactions()->exists() ? 'This investor has recorded transactions and cannot be deleted.' : null;
    }
}
