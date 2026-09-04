<?php

namespace App\Enums;

/**
 * Customer and Supplier share one table — a party can be both at once.
 */
enum ContactType: string
{
    case Customer = 'customer';
    case Supplier = 'supplier';
    case Both = 'both';
}
