<?php

namespace App\Models;

use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasLedger;
use Database\Factories\CompanyLoanFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A liability that grows on disbursement/interest and shrinks on repayment
 * — `outstanding_balance` only ever moves through
 * HasLedger::addLedgerTransaction(). `loan_amount`/`interest_rate` are
 * purely informational (the original agreed terms), never recalculated.
 */
class CompanyLoan extends Model
{
    use HasCreator;

    /** @use HasFactory<CompanyLoanFactory> */
    use HasFactory;

    use HasLedger;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'lender_name',
        'loan_amount',
        'interest_rate',
        'start_date',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'loan_amount' => 'float',
            'interest_rate' => 'float',
            'outstanding_balance' => 'float',
            'start_date' => 'date',
        ];
    }

    /**
     * @return HasMany<LoanTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(LoanTransaction::class);
    }

    protected function ledgerBalanceColumn(): string
    {
        return 'outstanding_balance';
    }

    /**
     * Why this record can't be deleted, or null when it can — one rule for the single and the bulk delete.
     */
    public function deletionBlockReason(): ?string
    {
        return $this->transactions()->exists() ? 'This loan has recorded transactions and cannot be deleted.' : null;
    }
}
