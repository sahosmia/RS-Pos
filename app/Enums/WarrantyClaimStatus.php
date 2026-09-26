<?php

namespace App\Enums;

enum WarrantyClaimStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Rejected = 'rejected';
}
