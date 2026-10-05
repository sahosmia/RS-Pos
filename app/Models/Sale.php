<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use App\Enums\DiscountType;
use App\Enums\PaymentStatus;
use App\Enums\SalePaymentType;
use App\Enums\SaleSource;
use App\Enums\SaleStatus;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use App\Traits\HasAccountTransactions;
use Database\Factories\SaleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Sale extends Model
{
    use HasAccountTransactions;
    use HasCreator;

    /** @use HasFactory<SaleFactory> */
    use HasFactory;

    use LogsActivityDefaults;

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
        'sales_order_id',
        'invoice_no',
        'sale_date',
        'discount_type',
        'discount_value',
        'status',
        'source',
        'delivery_status',
        'delivered_at',
        'valid_until',
        'financing_type',
        'installment_count',
        'created_by',
    ];

    /**
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
            'financing_type' => SalePaymentType::class,
            'installment_count' => 'integer',
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
     * Set only when ConvertSalesOrderToSaleAction created this sale from a
     * Sales Order booking.
     *
     * @return BelongsTo<SalesOrder, $this>
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    /**
     * @return HasMany<SaleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * @return HasMany<EmiInstallment, $this>
     */
    public function emiInstallments(): HasMany
    {
        return $this->hasMany(EmiInstallment::class);
    }

    /**
     * @return HasMany<SaleReturn, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
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
     *
     * A sale converted from a Sales Order also folds in the advance
     * collected against that order (still keyed to `reference_type =
     * 'sales_order'` there, never rewritten) — that's the "carried into the
     * Sale's paid_amount" behaviour ConvertSalesOrderToSaleAction relies on,
     * without ever double-recording the cash itself.
     */
    /**
     * Installation charge billed on this sale — whatever the total carries beyond the goods after discount.
     * Derived (not stored) so sales made before installation was billed keep reading 0.
     */
    public function getInstallationAmountAttribute(): float
    {
        return max(round($this->total_amount - ($this->subtotal - $this->discount_amount), 2), 0.0);
    }

    public function recalculatePaymentTotals(): void
    {
        $paidViaAccounts = $this->sumAccountTransactions('sale', $this->id);

        $advanceCarried = $this->sales_order_id
            ? $this->sumAccountTransactions('sales_order', $this->sales_order_id)
            : 0.0;

        $waived = $this->waivedAmount();

        $paidAmount = round($paidViaAccounts + $advanceCarried, 2);
        $dueAmount = round($this->total_amount - $paidAmount - $waived, 2);

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'due_amount' => $dueAmount,
            'payment_status' => PaymentStatus::fromAmounts(round($paidAmount + $waived, 2), $this->total_amount),
        ])->save();
    }

    /**
     * Discount waived against this invoice from the customer's ledger. It
     * settles part of the due without any cash, so it is not "paid" — but the
     * invoice counts as settled to that extent.
     */
    public function waivedAmount(): float
    {
        return round(abs((float) DB::table('contact_ledger')
            ->where('reference_type', 'sale')
            ->where('reference_id', $this->id)
            ->where('type', 'discount_waived')
            ->sum('amount')), 2);
    }

    /**
     * Confirmed invoices still owing money, oldest first — where a payment or
     * discount that isn't aimed at one invoice lands. EMI sales are left out:
     * their due is settled installment by installment.
     *
     * @param  Builder<Sale>  $query
     * @return Builder<Sale>
     */
    public function scopeAllocatableDue(Builder $query): Builder
    {
        return $query
            ->where('status', SaleStatus::Confirmed)
            ->where('due_amount', '>', 0)
            ->where(fn (Builder $q) => $q->whereNull('financing_type')->orWhere('financing_type', '!=', SalePaymentType::Emi))
            ->orderBy('sale_date')
            ->orderBy('id');
    }
}
