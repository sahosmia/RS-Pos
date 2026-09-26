<?php

namespace App\Enums;

enum CampaignTargetType: string
{
    case AllCustomers = 'all_customers';
    case CustomerGroup = 'customer_group';
    case CustomSelection = 'custom_selection';
}
