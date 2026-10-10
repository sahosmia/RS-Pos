<?php

namespace App\Support;

/**
 * Shared result-tracking object for every Import class (Products, Contacts,
 * Opening Stock, Sales) — one row/group failing never aborts the whole
 * file, it's just counted and explained back to the user alongside
 * whatever did succeed.
 *
 * Each import also tells it which row it is on (`row()`), so the result can list, row by row, what value went into
 * which field and whether the row was (or, in a preview, would be) imported or skipped, and why.
 */
class ImportResult
{
    /** The page shows this many rows; the counts above always cover the whole file. */
    private const MAX_ROWS = 300;

    public int $created = 0;

    public int $skipped = 0;

    /** @var list<string> */
    public array $messages = [];

    /** @var list<array{where: string, status: 'created'|'skipped', values: array<string, string>, reason: string|null}> */
    public array $rows = [];

    private ?string $where = null;

    /** @var array<string, string> */
    private array $values = [];

    /**
     * The row (or invoice) the import is working on, with the values read from it, keyed by field name.
     *
     * @param  array<string, mixed>  $values
     */
    public function row(string|int $where, array $values): void
    {
        $this->where = (string) $where;
        $this->values = [];

        foreach ($values as $field => $value) {
            if ($value !== null && $value !== '') {
                $this->values[(string) $field] = is_scalar($value) ? (string) $value : json_encode($value);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $extraValues  worked-out values worth showing next to the row (e.g. an invoice total)
     */
    public function addCreated(array $extraValues = []): void
    {
        $this->created++;

        foreach ($extraValues as $field => $value) {
            $this->values[(string) $field] = (string) $value;
        }

        $this->remember('created', null);
    }

    public function addSkipped(string $reason): void
    {
        $this->skipped++;
        $this->messages[] = $reason;

        $this->remember('skipped', $reason);
    }

    /**
     * @return array{created: int, skipped: int, messages: list<string>, rows: list<array{where: string, status: string, values: array<string, string>, reason: string|null}>, rows_truncated: bool}
     */
    public function toArray(): array
    {
        return [
            'created' => $this->created,
            'skipped' => $this->skipped,
            'messages' => $this->messages,
            'rows' => $this->rows,
            'rows_truncated' => ($this->created + $this->skipped) > count($this->rows),
        ];
    }

    private function remember(string $status, ?string $reason): void
    {
        if ($this->where !== null && count($this->rows) < self::MAX_ROWS) {
            $this->rows[] = ['where' => $this->where, 'status' => $status, 'values' => $this->values, 'reason' => $reason];
        }

        // The next row starts clean: a skip that happens before any row() must not borrow the previous row's values.
        $this->where = null;
        $this->values = [];
    }
}
