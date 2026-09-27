<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ExpenseCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    /** @use HasFactory<ExpenseCategoryFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * `chart_of_account_id` is only ever set by CreateExpenseCategoryAction
     * (never picked manually) — fillable purely so that action's
     * mass-assigned `create()` call can set it.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'parent_id',
        'chart_of_account_id',
    ];

    /**
     * @return BelongsTo<ChartOfAccount, $this>
     */
    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }

    /**
     * @return BelongsTo<ExpenseCategory, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    /**
     * @return HasMany<ExpenseCategory, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    /**
     * @return HasMany<Expense, $this>
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
