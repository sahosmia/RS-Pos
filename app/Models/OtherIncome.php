<?php

namespace App\Models;

use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\OtherIncomeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Small income that isn't a sale — scrap/cartons sold, interest, commission... Money lands in
 * `account` and the Journal credits Other Income (4400).
 */
class OtherIncome extends Model
{
    use HasCreator;

    /** @use HasFactory<OtherIncomeFactory> */
    use HasFactory;

    use LogsActivityDefaults;
    use SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'other_income_category_id',
        'account_id',
        'amount',
        'income_date',
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
            'income_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<OtherIncomeCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(OtherIncomeCategory::class, 'other_income_category_id');
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
