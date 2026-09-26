<?php

namespace App\Models;

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
    /** @use HasFactory<InvestorFactory> */
    use HasFactory;

    use HasLedger;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_invested' => 'float',
        ];
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
}
