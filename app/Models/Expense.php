<?php

namespace App\Models;

use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * Money spent and paid in full on the spot from `account` — no vendor, no due.
 */
class Expense extends Model implements HasMedia
{
    /** @use HasFactory<ExpenseFactory> */
    use HasFactory;

    use HasCreator;
    use InteractsWithMedia;
    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'expense_category_id',
        'account_id',
        'total_amount',
        'expense_date',
        'note',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'total_amount' => 'float',
        ];
    }

    /**
     * A single optional receipt/bill attachment — same polymorphic `media`
     * table Contact's document uploads already use, no dedicated column.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents')
            ->acceptsMimeTypes(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
            ->singleFile();
    }

    /**
     * @return BelongsTo<ExpenseCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
