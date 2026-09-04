<?php

namespace App\Models;

use App\Enums\ContactLedgerType;
use Database\Factories\ContactLedgerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The immutable audit trail behind `contacts.balance` — never edited, only
 * appended to. Always written together with the cached balance via
 * LedgerService.
 */
class ContactLedger extends Model
{
    /** @use HasFactory<ContactLedgerFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'contact_ledger';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'contact_id',
        'type',
        'amount',
        'reference_type',
        'reference_id',
        'note',
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
            'type' => ContactLedgerType::class,
            'amount' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
