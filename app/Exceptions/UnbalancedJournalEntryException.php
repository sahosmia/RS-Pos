<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by JournalService::post() when a proposed entry's total debits
 * don't equal its total credits — this must never be allowed to reach the
 * database, since every General Ledger report assumes it can't happen.
 */
class UnbalancedJournalEntryException extends RuntimeException
{
    public function __construct(float $totalDebit, float $totalCredit)
    {
        parent::__construct(
            sprintf('Unbalanced journal entry: total debit %.2f does not equal total credit %.2f.', $totalDebit, $totalCredit),
        );
    }
}
