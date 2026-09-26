<?php

namespace App\Models;

use Database\Factories\StaffLedgerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffLedger extends Model
{
    /** @use HasFactory<StaffLedgerFactory> */
    use HasFactory;

    /**
     * The design doc names this table `staff_ledger` (singular, matching
     * `contact_ledger`) — Eloquent's guess would be `staff_ledgers`.
     */
    protected $table = 'staff_ledger';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'staff_id',
        'staff_transaction_type_id',
        'amount',
        'account_id',
        'reference_id',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    /**
     * @return BelongsTo<StaffTransactionType, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(StaffTransactionType::class, 'staff_transaction_type_id');
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
