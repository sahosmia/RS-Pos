<?php

namespace App\Enums;

/**
 * `installation` — auto-created at Sale confirm time when the item's
 * installation_required is set; never counted against a period's free
 * quota. `service` — created later via the Service Requests page, checked
 * against the sold unit's current free quota.
 */
enum ServiceRequestType: string
{
    case Installation = 'installation';
    case Service = 'service';
}
