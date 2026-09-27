<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Expense extends Model implements HasMedia
{
    /** @use HasFactory<ExpenseFactory> */
    use HasFactory;

    use InteractsWithMedia;
    use LogsActivityDefaults;

    /**
     * `paid_amount`/`due_amount`/`payment_status` are deliberately not
     * fillable — they're derived and only ever written by
     * CreateExpenseAction/UpdateExpenseAction/AddExpensePaymentAction.
     *
     * @var list<string>
     */
    protected $fillable = [
        'expense_category_id',
        'contact_id',
        'total_amount',
        'expense_date',
        'due_date',
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
            'due_date' => 'date',
            'total_amount' => 'float',
            'paid_amount' => 'float',
            'due_amount' => 'float',
            'payment_status' => PaymentStatus::class,
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
     * The landlord/vendor this is owed to — nullable, only set when the
     * expense is actually owed to a tracked party.
     *
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Nothing paid yet — the journal/ledger footprint so far is exactly one
     * (reversible) due entry, so category/contact/total_amount/date can
     * still be corrected. Once any payment lands, corrections go through a
     * new adjustment instead of an in-place edit.
     */
    public function canEdit(): bool
    {
        return $this->paid_amount <= 0.0;
    }

    /**
     * Re-derive paid_amount/due_amount/payment_status from the actual
     * account_transactions referencing this expense — the source of truth,
     * never accumulated incrementally.
     */
    public function recalculatePaymentTotals(): void
    {
        $paidViaAccounts = abs((float) DB::table('account_transactions')
            ->where('reference_type', 'expense')
            ->where('reference_id', $this->id)
            ->sum('amount'));

        $paidAmount = round($paidViaAccounts, 2);
        $dueAmount = round($this->total_amount - $paidAmount, 2);

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'due_amount' => $dueAmount,
            'payment_status' => PaymentStatus::fromAmounts($paidAmount, $this->total_amount),
        ])->save();
    }
}
