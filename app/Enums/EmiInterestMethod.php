<?php

namespace App\Enums;

enum EmiInterestMethod: string
{
    /** No interest: the financed amount is split evenly. */
    case None = 'none';

    /** Simple interest on the original financed amount for the whole tenure. */
    case Flat = 'flat';

    /** Bank-style: equal installments, interest charged on the balance still owed. */
    case Reducing = 'reducing';
}
