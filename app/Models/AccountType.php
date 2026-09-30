<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\AccountTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountType extends Model
{
    /** @use HasFactory<AccountTypeFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * Cash-type accounts get their General Ledger sub-account under a different
     * parent (1010) than every other type (1020) — see CreateAccountAction — so
     * this type is matched by name and must never be renamed or deleted.
     */
    public const CASH = 'Cash';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
    ];

    public function isProtected(): bool
    {
        return $this->name === self::CASH;
    }

    /**
     * @return HasMany<Account, $this>
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }
}
