<?php

namespace App\Models;

use App\Enums\ContactLedgerType;
use App\Models\Concerns\HasCreator;
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
    use HasCreator;

    /** @use HasFactory<ContactLedgerFactory> */
    use HasFactory;

    protected $table = 'contact_ledger';

    /**
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
