<?php

namespace App\Queries\Accounting;

use App\Models\JournalEntry;
use Illuminate\Database\Eloquent\Builder;

class JournalEntryQuery
{
    /**
     * Shared by the Journal Entries list page and its export endpoint so the
     * two never drift apart — an export must return exactly the rows the
     * list page shows for the same filters.
     *
     * @param  array{from?: ?string, to?: ?string, chart_of_account_id?: ?int, sort?: ?string, direction?: ?string}  $filters
     * @return Builder<JournalEntry>
     */
    public static function filtered(array $filters): Builder
    {
        $sort = $filters['sort'] ?? 'entry_date';
        $direction = $filters['direction'] ?? 'desc';
        $allowedSorts = ['entry_number', 'entry_date', 'is_reversed', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'entry_date';
        }
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        return JournalEntry::query()
            ->with('lines.chartOfAccount:id,code,name')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('entry_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('entry_date', '<=', $to))
            ->when(
                $filters['chart_of_account_id'] ?? null,
                fn (Builder $q, int $id) => $q->whereHas('lines', fn (Builder $lines) => $lines->where('chart_of_account_id', $id)),
            )
            ->orderBy($sort, $direction)
            ->orderByDesc('id');
    }
}
