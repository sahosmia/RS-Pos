<?php

namespace App\Models;

use App\Enums\StaffStatus;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\StaffFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Resembles Contact — same cached-balance + ledger pattern, same sign
 * convention (positive = staff owes company, negative = company owes
 * staff) — but for employees. `balance` is deliberately not fillable; it
 * only ever moves through AddStaffTransactionAction, alongside a
 * staff_ledger row.
 */
class Staff extends Model
{
    /** @use HasFactory<StaffFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'address',
        'designation',
        'joining_date',
        'salary_amount',
        'status',
        'investor_id',
        'user_id',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'joining_date' => 'date',
            'salary_amount' => 'float',
            'status' => StaffStatus::class,
            'balance' => 'float',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<StaffLedger, $this>
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(StaffLedger::class);
    }

    /**
     * Interprets the +/- balance sign convention into human text — avoids
     * repeating this interpretation in every view (mirrors Contact).
     *
     * @return Attribute<string, never>
     */
    protected function balanceLabel(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->balance > 0
                ? 'Owes company ৳'.number_format($this->balance, 2)
                : ($this->balance < 0 ? 'Company owes ৳'.number_format(abs($this->balance), 2) : 'Settled'),
        );
    }
}
