<?php

namespace App\Models;

use App\Enums\AssetTransactionType;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasLedger;
use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A value-holding entity, same cached-balance + immutable-transaction
 * pattern as Account/Product — `current_value` only ever moves through
 * HasLedger::addLedgerTransaction(), alongside an asset_transactions row.
 */
class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory;

    use HasCreator;
    use HasLedger;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'opening_value',
        'purchase_date',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'opening_value' => 'float',
            'current_value' => 'float',
            'purchase_date' => 'date',
        ];
    }

    /**
     * @return HasMany<AssetTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(AssetTransaction::class);
    }

    protected function ledgerBalanceColumn(): string
    {
        return 'current_value';
    }

    /**
     * The opening entry stays correctable only while nothing else has
     * happened to this asset — same rule as Account's opening balance.
     */
    public function canEditOpeningValue(): bool
    {
        return ! $this->transactions()
            ->where('type', '!=', AssetTransactionType::OpeningAsset)
            ->exists();
    }

    public function openingTransaction(): ?AssetTransaction
    {
        return $this->transactions()
            ->where('type', AssetTransactionType::OpeningAsset)
            ->first();
    }
}
