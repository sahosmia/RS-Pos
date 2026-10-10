<?php

namespace App\Models;

use App\Enums\ContactEntityType;
use App\Enums\ContactPrefix;
use App\Enums\ContactType;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Contact extends Model implements HasMedia
{
    use HasCreator;

    /** @use HasFactory<ContactFactory> */
    use HasFactory;

    use InteractsWithMedia;
    use LogsActivityDefaults;

    /**
     * `balance` is deliberately not fillable — it may only change through
     * LedgerService, alongside a contact_ledger row.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'prefix',
        'first_name',
        'middle_name',
        'last_name',
        'contact_code',
        'phone',
        'phone_alternate',
        'email',
        'address',
        'shipping_address',
        'reference',
        'type',
        'entity_type',
        'business_name',
        'customer_group_id',
        'is_active',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ContactType::class,
            'entity_type' => ContactEntityType::class,
            'prefix' => ContactPrefix::class,
            'balance' => 'float',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Trim whitespace on write to avoid near-duplicate entries.
     *
     * @return Attribute<string, string>
     */
    protected function name(): Attribute
    {
        return Attribute::make(set: fn (string $value) => trim($value));
    }

    /**
     * Normalized to a consistent digits-and-plus format, since the SMS/
     * WhatsApp notification feature needs a reliable format to call out to.
     *
     * @return Attribute<string, string>
     */
    protected function phone(): Attribute
    {
        return Attribute::make(set: fn (string $value) => preg_replace('/[^0-9+]/', '', $value));
    }

    /**
     * @return Attribute<string|null, string|null>
     */
    protected function email(): Attribute
    {
        return Attribute::make(set: fn (?string $value) => $value ? strtolower(trim($value)) : null);
    }

    /**
     * The name shown first wherever a contact is labeled — a business
     * contact's business_name takes priority, with `name` (the contact
     * person) as the secondary/fallback. Falls back to `name` when no
     * business_name is set.
     *
     * @return Attribute<string, never>
     */
    protected function displayName(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->business_name ?: $this->name,
        );
    }

    /**
     * @return BelongsTo<CustomerGroup, $this>
     */
    public function customerGroup(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class);
    }

    /**
     * @return HasMany<ContactLedger, $this>
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(ContactLedger::class);
    }

    /**
     * @return HasMany<Purchase, $this>
     */
    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class, 'supplier_id');
    }

    /**
     * @return HasMany<Sale, $this>
     */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'customer_id');
    }

    /**
     * @return HasMany<SalesOrder, $this>
     */
    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class, 'customer_id');
    }

    /**
     * @return HasMany<MessageLog, $this>
     */
    public function messageLogs(): HasMany
    {
        return $this->hasMany(MessageLog::class);
    }

    /**
     * @return HasMany<CampaignRecipient, $this>
     */
    public function campaignRecipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    /**
     * @param  Builder<Contact>  $query
     */
    public function scopeCustomers(Builder $query): void
    {
        $query->whereIn('type', [ContactType::Customer, ContactType::Both]);
    }

    /**
     * @param  Builder<Contact>  $query
     */
    public function scopeSuppliers(Builder $query): void
    {
        $query->whereIn('type', [ContactType::Supplier, ContactType::Both]);
    }

    /**
     * Interprets the +/- balance sign convention into human text — avoids
     * repeating this interpretation in every view.
     *
     * @return Attribute<string, never>
     */
    protected function balanceLabel(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->balance > 0
                ? 'Receivable ৳'.number_format($this->balance, 2)
                : ($this->balance < 0 ? 'Payable ৳'.number_format(abs($this->balance), 2) : 'Settled'),
        );
    }

    /**
     * Opening balance stays settable only until the first ledger entry is
     * recorded (the opening entry itself included) — afterwards it must be
     * corrected with an adjustment entry.
     */
    public function canSetOpeningBalance(): bool
    {
        return ! $this->ledgerEntries()->exists();
    }

    /**
     * Re-calculates and saves the cached balance from the contact's ledger entries.
     */
    public function recalculateBalance(): void
    {
        $total = (float) $this->ledgerEntries()->sum('amount');

        $this->forceFill([
            'balance' => round($total, 2),
        ])->save();
    }

    /**
     * Contact documents (ID copy, agreement, etc.) — no custom column, just
     * the package's polymorphic `media` table.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents')
            ->acceptsMimeTypes(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
    }
}
