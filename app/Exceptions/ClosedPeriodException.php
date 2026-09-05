<?php

namespace App\Exceptions;

use Carbon\CarbonInterface;
use RuntimeException;

/**
 * Thrown by JournalService::post() when the entry's date falls in a Closed
 * accounting period — prevents an already-reported month from silently
 * changing.
 */
class ClosedPeriodException extends RuntimeException
{
    public function __construct(CarbonInterface $date)
    {
        parent::__construct("Cannot post a journal entry dated {$date->toDateString()} — that accounting period is closed.");
    }
}
