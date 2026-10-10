<?php

namespace App\Enums;

enum ServiceRequestStatus: string
{
    case Pending = 'pending';
    case Scheduled = 'scheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * Where a request can go from here. Completed and Cancelled are final: a finished or called-off job is never
     * reopened (a new request is made instead), so the history stays true.
     *
     * @return list<self>
     */
    public function nextStatuses(): array
    {
        return match ($this) {
            self::Pending => [self::Scheduled, self::Completed, self::Cancelled],
            self::Scheduled => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }

    public function isFinal(): bool
    {
        return $this->nextStatuses() === [];
    }
}
