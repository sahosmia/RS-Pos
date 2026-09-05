<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by JournalService::reverse() when asked to reverse an entry that
 * has already been reversed — a journal entry can only ever be corrected
 * once, by one mirrored entry.
 */
class AlreadyReversedException extends RuntimeException
{
    public function __construct(int $journalEntryId)
    {
        parent::__construct("Journal entry #{$journalEntryId} has already been reversed.");
    }
}
