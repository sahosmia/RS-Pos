<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Standalone "Add Discount" entry point — the same ledger-level waiver
 * `ContactDueWaiverController` posts from the Contact Detail page, just
 * picking the contact first instead of already being on their page.
 */
class BillDiscountController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('bills/discount');
    }
}
