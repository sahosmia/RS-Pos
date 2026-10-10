<?php

namespace App\Support;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;

/**
 * "Delete selected" for list pages. It has no rules of its own: every record goes through the same
 * `$blockedBy` check the single delete uses, a refused record is kept (and its reason reported), and the
 * others are deleted one by one — so a partly-deletable selection removes what it may and nothing more.
 */
class BulkDelete
{
    /**
     * @template TModel of Model
     *
     * @param  list<int>  $requestedIds  What was ticked — an id with no matching record (already gone, or not the user's to see) counts as kept.
     * @param  Collection<int, TModel>  $records
     * @param  Closure(TModel): ?string  $blockedBy  The single-delete rule: a reason to keep the record, or null.
     * @param  Closure(TModel): mixed  $delete  The single-delete action.
     * @return array{deleted: int, kept: int, reasons: list<string>}
     */
    public static function run(array $requestedIds, Collection $records, Closure $blockedBy, Closure $delete): array
    {
        $deleted = 0;
        $reasons = [];

        if ($records->count() < count($requestedIds)) {
            $reasons[] = 'Some selected records were not found or are not yours to delete.';
        }

        foreach ($records as $record) {
            if ($reason = $blockedBy($record)) {
                $reasons[] = $reason;

                continue;
            }

            $delete($record);
            $deleted++;
        }

        return ['deleted' => $deleted, 'kept' => count($requestedIds) - $deleted, 'reasons' => array_values(array_unique($reasons))];
    }

    /**
     * @param  array{deleted: int, kept: int, reasons: list<string>}  $result
     */
    public static function respond(array $result): RedirectResponse
    {
        if ($result['kept'] === 0) {
            return back();
        }

        $message = "{$result['deleted']} deleted, {$result['kept']} kept. ".implode(' ', array_slice($result['reasons'], 0, 3));

        return back()->withErrors(['bulk_delete' => trim($message)]);
    }
}
