<?php

namespace App\Enums;

/**
 * Which side increases a Chart of Accounts row's cached `balance` — debit
 * for asset/expense accounts, credit for liability/equity/income accounts.
 */
enum NormalBalance: string
{
    case Debit = 'debit';
    case Credit = 'credit';
}
