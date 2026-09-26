<?php

namespace App\Enums;

enum CampaignStatus: string
{
    case Draft = 'draft';
    case Sending = 'sending';
    case Completed = 'completed';
    case Failed = 'failed';
}
