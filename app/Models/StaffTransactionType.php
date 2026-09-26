<?php

namespace App\Models;

use App\Enums\BalanceEffect;
use App\Enums\StaffTransactionNature;
use Database\Factories\StaffTransactionTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffTransactionType extends Model
{
    /** @use HasFactory<StaffTransactionTypeFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'effect_on_balance',
        'nature',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effect_on_balance' => BalanceEffect::class,
            'nature' => StaffTransactionNature::class,
        ];
    }

    /**
     * @return HasMany<StaffLedger, $this>
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(StaffLedger::class);
    }
}
