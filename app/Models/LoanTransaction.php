<?php

namespace App\Models;

use App\Enums\LoanTransactionType;
use App\Models\Concerns\HasCreator;
use Database\Factories\LoanTransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanTransaction extends Model
{
    use HasCreator;

    /** @use HasFactory<LoanTransactionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'company_loan_id',
        'type',
        'amount',
        'account_id',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => LoanTransactionType::class,
            'amount' => 'float',
        ];
    }

    /**
     * @return BelongsTo<CompanyLoan, $this>
     */
    public function companyLoan(): BelongsTo
    {
        return $this->belongsTo(CompanyLoan::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
