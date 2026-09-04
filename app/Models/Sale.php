<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use App\Enums\DiscountType;
use App\Enums\PaymentStatus;
use App\Enums\SalePaymentType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use Database\Factories\SaleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Sale extends Model
{
    /** @use HasFactory<SaleFactory> */
    use HasFactory;

    /**
     * `subtotal`/`discount_amount`/`total_amount`/`paid_amount`/
     * `due_amount`/`payment_status` are deliberately not fillable — they're
     * derived and only ever written by CreateSaleAction/ConfirmSaleAction/
     * AddSalePaymentAction.
     *
     * @var list<string>
     */
    protected $fillable = [
        'customer_id',
        'invoice_no',
        'sale_date',
        'discount_type',
        'discount_value',
        'status',
        'source',
        'delivery_status',
        'delivered_at',
        'valid_until',
        'payment_type',
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
            'sale_date' => 'date',
            'subtotal' => 'float',
            'discount_type' => DiscountType::class,
            'discount_value' => 'float',
            'discount_amount' => 'float',
            'total_amount' => 'float',
            'paid_amount' => 'float',
            'due_amount' => 'float',
            'payment_status' => PaymentStatus::class,
            'status' => SaleStatus::class,
            'source' => SaleSource::class,
            'delivery_status' => DeliveryStatus::class,
            'delivered_at' => 'datetime',
            'valid_until' => 'date',
            'payment_type' => SalePaymentType::class,
        ];
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * @return HasMany<SaleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * Draft/Quotation carry no stock movement or ledger entry yet, so they
     * stay freely editable. Once Confirmed (or Cancelled), corrections must
     * go through a Stock Adjustment / the Undo flow instead of direct edit.
     */
    public function canEdit(): bool
    {
        return in_array($this->status, [SaleStatus::Draft, SaleStatus::Quotation], true);
    }

    /**
     * A "Historical record" (manual back-entry or bulk import) — no stock
     * movement, ledger entry, or account transaction was ever created for
     * it, so there's nothing to reverse if it's later removed.
     */
    public function isHistorical(): bool
    {
        return $this->source === SaleSource::Imported;
    }

    /**
     * Re-derive paid_amount/due_amount/payment_status from the actual
     * account_transactions referencing this sale — the source of truth,
     * never accumulated incrementally.
     */
    public function recalculatePaymentTotals(): void
    {
        $paidViaAccounts = abs((float) DB::table('account_transactions')
            ->where('reference_type', 'sale')
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
