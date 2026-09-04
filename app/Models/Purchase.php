<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\PurchaseStatus;
use Database\Factories\PurchaseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Purchase extends Model
{
    /** @use HasFactory<PurchaseFactory> */
    use HasFactory;

    /**
     * `total_amount`/`paid_amount`/`due_amount`/`payment_status` are
     * deliberately not fillable — they're derived and only ever written by
     * CreatePurchaseAction/ConfirmPurchaseAction/AddPurchasePaymentAction.
     *
     * @var list<string>
     */
    protected $fillable = [
        'supplier_id',
        'invoice_no',
        'purchase_date',
        'status',
        'created_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'total_amount' => 'float',
            'paid_amount' => 'float',
            'due_amount' => 'float',
            'payment_status' => PaymentStatus::class,
            'status' => PurchaseStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * @return HasMany<PurchaseItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    /**
     * Draft/Ordered carry no stock movement or ledger entry yet, so they
     * stay freely editable. Once Received (or Cancelled), corrections must
     * go through a Stock Adjustment instead of direct edit.
     */
    public function canEdit(): bool
    {
        return in_array($this->status, [PurchaseStatus::Draft, PurchaseStatus::Ordered], true);
    }

    /**
     * Re-derive paid_amount/due_amount/payment_status from the actual
     * account_transactions + credit_applied ledger entries referencing this
     * purchase — the source of truth, never accumulated incrementally.
     */
    public function recalculatePaymentTotals(): void
    {
        $paidViaAccounts = abs((float) DB::table('account_transactions')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->sum('amount'));

        $creditApplied = abs((float) DB::table('contact_ledger')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->where('type', 'credit_applied')
            ->sum('amount'));

        $paidAmount = round($paidViaAccounts + $creditApplied, 2);
        $dueAmount = round($this->total_amount - $paidAmount, 2);

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'due_amount' => $dueAmount,
            'payment_status' => PaymentStatus::fromAmounts($paidAmount, $this->total_amount),
        ])->save();
    }
}
