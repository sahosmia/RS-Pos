<?php

namespace App\Models;

use App\Enums\EmiInstallmentStatus;
use Database\Factories\EmiInstallmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmiInstallment extends Model
{
    /** @use HasFactory<EmiInstallmentFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sale_id',
        'installment_number',
        'due_date',
        'amount',
        'principal_amount',
        'interest_amount',
        'paid_amount',
        'status',
        'paid_at',
        'account_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'amount' => 'float',
            'principal_amount' => 'float',
            'interest_amount' => 'float',
            'paid_amount' => 'float',
            'status' => EmiInstallmentStatus::class,
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Sale, $this>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
