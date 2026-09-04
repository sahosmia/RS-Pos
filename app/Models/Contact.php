<?php

namespace App\Models;

use App\Enums\ContactEntityType;
use App\Enums\ContactType;
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
    /** @use HasFactory<ContactFactory> */
    use HasFactory;

    use InteractsWithMedia;

    /**
     * `balance` is deliberately not fillable — it may only change through
     * LedgerService, alongside a contact_ledger row.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'shipping_address',
        'type',
        'entity_type',
        'business_name',
        'customer_group_id',
        'is_active',
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
            'type' => ContactType::class,
            'entity_type' => ContactEntityType::class,
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
     * Contact documents (ID copy, agreement, etc.) — no custom column, just
     * the package's polymorphic `media` table.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents')
            ->acceptsMimeTypes(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
    }
}
