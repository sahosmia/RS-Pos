<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Standalone "Bill Receive" entry point — the same settlement
 * `ContactPaymentController` posts from the Contact Detail page, just
 * picking the customer first instead of already being on their page.
 */
class BillReceiveController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('bills/receive', [
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }
}
