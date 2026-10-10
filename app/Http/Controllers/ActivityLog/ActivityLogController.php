<?php

namespace App\Http\Controllers\ActivityLog;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Models\User;
use App\Queries\ActivityLog\ActivityLogQuery;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /** Columns tried, in order, to name the record an entry is about ("INV-0012", "Split AC"). */
    private const LABEL_FIELDS = ['invoice_no', 'purchase_no', 'order_no', 'expense_no', 'display_name', 'name', 'title', 'code'];

    /** The log opens on this many days (today included): the table can hold years of rows, and the page should stay quick. */
    private const DEFAULT_DAYS = 7;

    /** Most field changes shown per entry — the rest collapse into "+N more". */
    private const MAX_CHANGES = 8;

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'causer_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:255'],
            'event' => ['nullable', 'in:created,updated,deleted,login,logout'],
            'per_page' => ['nullable', 'string', 'max:10'],
        ]);

        $perPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        // Opening the page with no dates shows the last few days. Clearing a date on purpose (the field is sent empty) is a
        // choice to look further back, so that is respected.
        $defaults = [
            'from' => now()->subDays(self::DEFAULT_DAYS - 1)->toDateString(),
            'to' => now()->toDateString(),
        ];

        if (! $request->has('from') && ! $request->has('to')) {
            $validated = [...$validated, ...$defaults];
        }

        $activities = ActivityLogQuery::filtered($validated)
            ->paginate($perPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $activities->getCollection()->transform(fn (Activity $activity) => $this->present($activity));

        return Inertia::render('activity-log/index', [
            'activities' => $activities,
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
            'recordTypes' => $this->recordTypes(),
            'defaultRange' => $defaults,
            'filters' => [
                'from' => $validated['from'] ?? null,
                'to' => $validated['to'] ?? null,
                'causer_id' => $validated['causer_id'] ?? null,
                'subject_type' => $validated['subject_type'] ?? null,
                'event' => $validated['event'] ?? null,
                'per_page' => $perPage ?? 'all',
            ],
        ]);
    }

    /**
     * @return array{id: int, created_at: ?string, user: ?string, event: string, record_type: string, record: string, changes: list<array{field: string, old: ?string, new: ?string}>, more_changes: int, ip_address: ?string}
     */
    private function present(Activity $activity): array
    {
        $properties = $activity->properties;
        $new = (array) $properties->get('attributes', []);
        $old = (array) $properties->get('old', []);

        $changes = collect($new)
            ->map(fn ($value, string $field) => [
                'field' => Str::headline($field),
                'old' => array_key_exists($field, $old) ? $this->display($old[$field]) : null,
                'new' => $this->display($value),
            ])
            ->values();

        return [
            'id' => $activity->id,
            'created_at' => $activity->created_at?->toIso8601String(),
            'user' => $activity->causer?->name,
            'event' => $activity->event ?? $activity->description,
            'record_type' => $activity->subject_type ? Str::headline(class_basename($activity->subject_type)) : '—',
            'record' => $this->recordLabel($activity),
            'changes' => $changes->take(self::MAX_CHANGES)->all(),
            'more_changes' => max(0, $changes->count() - self::MAX_CHANGES),
            'ip_address' => $properties->get('ip_address'),
        ];
    }

    private function recordLabel(Activity $activity): string
    {
        $subject = $activity->subject;

        if ($subject instanceof Model) {
            foreach (self::LABEL_FIELDS as $field) {
                $value = $subject->getAttribute($field);

                if (is_string($value) && $value !== '') {
                    return $value;
                }
            }
        }

        // the record was deleted (or never had a readable name) — fall back to what the log itself kept
        $attributes = (array) $activity->properties->get('attributes', []);
        $old = (array) $activity->properties->get('old', []);

        $named = collect(self::LABEL_FIELDS)
            ->map(fn (string $field) => $attributes[$field] ?? $old[$field] ?? null)
            ->first(fn ($value) => is_string($value) && $value !== '');

        return $named ?? ($activity->subject_id ? '#'.$activity->subject_id : '—');
    }

    private function display(mixed $value): ?string
    {
        return match (true) {
            $value === null => null,
            is_bool($value) => $value ? 'Yes' : 'No',
            is_array($value) => Str::limit((string) json_encode($value, JSON_UNESCAPED_UNICODE), 80),
            default => Str::limit((string) $value, 80),
        };
    }

    /**
     * Record types that have at least one logged entry, for the filter dropdown.
     *
     * @return list<array{value: string, label: string}>
     */
    private function recordTypes(): array
    {
        return Activity::query()
            ->whereNotNull('subject_type')
            ->distinct()
            ->pluck('subject_type')
            ->map(fn (string $type) => ['value' => $type, 'label' => Str::headline(class_basename($type))])
            ->sortBy('label')
            ->values()
            ->all();
    }
}
