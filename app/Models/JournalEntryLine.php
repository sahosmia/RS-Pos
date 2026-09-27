<?php

namespace App\Models;

use Database\Factories\JournalEntryLineFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntryLine extends Model
{
    /** @use HasFactory<JournalEntryLineFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'journal_entry_id',
        'chart_of_account_id',
        'debit',
        'credit',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'debit' => 'float',
            'credit' => 'float',
        ];
    }

    /**
     * @return BelongsTo<JournalEntry, $this>
     */
    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /**
     * @return BelongsTo<ChartOfAccount, $this>
     */
    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
