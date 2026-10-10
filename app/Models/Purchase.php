<?php

namespace App\Models;

use App\Enums\AccountTransactionType;
use App\Enums\DiscountType;
use App\Enums\PaymentStatus;
use App\Enums\PurchaseStatus;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasAccountTransactions;
use Database\Factories\PurchaseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Purchase extends Model
{
    use HasAccountTransactions;
    use HasCreator;

    /** @use HasFactory<PurchaseFactory> */
    use HasFactory;

    use LogsActivityDefaults;
    use SoftDeletes;

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
        'discount_type',
        'discount_value',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'subtotal' => 'float',
            'discount_type' => DiscountType::class,
            'discount_value' => 'float',
            'discount_amount' => 'float',
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
     * @return HasMany<PurchaseReturn, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
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
        $paidViaAccounts = $this->sumAccountTransactions('purchase', $this->id);

        $creditApplied = abs((float) DB::table('contact_ledger')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->where('type', 'credit_applied')
            ->sum('amount'));

        $discountReceived = $this->discountReceivedAmount();

        $paidAmount = round($paidViaAccounts + $creditApplied, 2);
        $dueAmount = round($this->total_amount - $paidAmount - $discountReceived, 2);

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'due_amount' => $dueAmount,
            'payment_status' => PaymentStatus::fromAmounts(round($paidAmount + $discountReceived, 2), $this->total_amount),
        ])->save();
    }

    /**
     * Discount the supplier gave against this purchase from their ledger. It settles part of the due without any cash,
     * so it is not "paid" — but the purchase counts as settled to that extent.
     */
    public function discountReceivedAmount(): float
    {
        return round(abs((float) DB::table('contact_ledger')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->where('type', 'discount_received')
            ->sum('amount')), 2);
    }

    /**
     * Received purchases still owing money, oldest first — where a payment
     * that isn't aimed at one purchase lands.
     *
     * @param  Builder<Purchase>  $query
     * @return Builder<Purchase>
     */
    public function scopeAllocatableDue(Builder $query): Builder
    {
        return $query
            ->where('status', PurchaseStatus::Received)
            ->where('due_amount', '>', 0)
            ->orderBy('purchase_date')
            ->orderBy('id');
    }

    /**
     * Why this record can't be deleted, or null when it can — one rule for the single and the bulk delete.
     */
    public function deletionBlockReason(): ?string
    {
        return match (true) {
            ! $this->canEdit() => 'This purchase has already been received and cannot be deleted.',
            $this->paid_amount > 0 => 'This purchase already has a payment recorded — cancel it instead, so the payment is reversed properly.',
            default => null,
        };
    }

    /**
     * Narrows to what the user may see: everything with `purchase.view_all`, otherwise only the records they created.
     *
     * @param  Builder<Purchase>  $query
     */
    public function scopeVisibleTo(Builder $query, ?User $user): void
    {
        if ($user === null || ! $user->can('purchase.view_all')) {
            $query->where('created_by', $user?->id);
        }
    }

    /**
     * Why a Received purchase cannot be amended (edited after receiving), or null when it can. An amendment takes the
     * receipt out and records the corrected one, so anything built on it that cannot be redone must not exist.
     * (Units that were already sold and serials already sold are caught when the receipt is taken out.)
     */
    public function amendBlockReason(): ?string
    {
        return match (true) {
            $this->status !== PurchaseStatus::Received => 'Only a received purchase can be amended.',
            $this->returns()->exists() => 'This purchase has a return recorded against it — it can no longer be amended.',
            $this->discountReceivedAmount() > 0 => 'The supplier gave a discount against this purchase — it can no longer be amended.',
            $this->creditAppliedAmount() > 0 => 'Supplier credit was applied to this purchase — it can no longer be amended.',
            default => null,
        };
    }

    /**
     * Supplier credit used to pay part of this purchase (a ledger entry, not an account payment).
     */
    public function creditAppliedAmount(): float
    {
        return round(abs((float) DB::table('contact_ledger')
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->where('type', 'credit_applied')
            ->sum('amount')), 2);
    }

    /**
     * What was actually paid out on this purchase, per account — the payment rows an amendment starts from.
     *
     * @return list<array{account_id: int, amount: float}>
     */
    public function paidPerAccount(): array
    {
        return AccountTransaction::query()
            ->where('reference_type', 'purchase')
            ->where('reference_id', $this->id)
            ->where('type', AccountTransactionType::PurchasePayment)
            ->selectRaw('account_id, SUM(amount) as amount')
            ->groupBy('account_id')
            ->get()
            // Payments are stored as money leaving the account (negative).
            ->map(fn ($row) => ['account_id' => (int) $row->account_id, 'amount' => round(abs((float) $row->amount), 2)])
            ->filter(fn (array $row) => $row['amount'] > 0)
            ->values()
            ->all();
    }
}
