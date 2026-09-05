<?php

namespace App\Enums;

/**
 * `emi` is reserved for the future EMI module (পর্ব ১১) — accepted now so
 * the column exists, but no installment logic runs on it yet.
 */
enum SalePaymentType: string
{
    case OneTime = 'one_time';
    case Emi = 'emi';
}
