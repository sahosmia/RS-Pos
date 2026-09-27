<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Standalone "Bill Pay" entry point — the same settlement
 * `ContactPaymentController` posts from the Contact Detail page, just
 * picking the supplier first instead of already being on their page.
 */
class BillPayController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('bills/pay', [
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }
}
