<?php

namespace App\Models;

use App\Enums\JournalEntryStatus;
use App\Models\Concerns\HasCreator;
use Database\Factories\JournalEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    use HasCreator;

    /** @use HasFactory<JournalEntryFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'entry_date',
        'description',
        'reference_type',
        'reference_id',
        'created_by',
        'status',
        'reversed_at',
        'reversed_by',
        'reversal_of_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'status' => JournalEntryStatus::class,
            'reversed_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<JournalEntryLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    /**
     * The original entry this one reverses, if this entry is itself a
     * reversal.
     *
     * @return BelongsTo<JournalEntry, $this>
     */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'reversal_of_id');
    }

    public function isReversed(): bool
    {
        return $this->status === JournalEntryStatus::Reversed;
    }
}
