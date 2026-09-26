<?php

namespace App\Support;

/**
 * Shared result-tracking object for every Import class (Products, Contacts,
 * Opening Stock, Sales) — one row/group failing never aborts the whole
 * file, it's just counted and explained back to the user alongside
 * whatever did succeed.
 */
class ImportResult
{
    public int $created = 0;

    public int $skipped = 0;

    /** @var list<string> */
    public array $messages = [];

    public function addCreated(): void
    {
        $this->created++;
    }

    public function addSkipped(string $reason): void
    {
        $this->skipped++;
        $this->messages[] = $reason;
    }

    /**
     * @return array{created: int, skipped: int, messages: list<string>}
     */
    public function toArray(): array
    {
        return [
            'created' => $this->created,
            'skipped' => $this->skipped,
            'messages' => $this->messages,
        ];
    }
}
