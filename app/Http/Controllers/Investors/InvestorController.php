<?php

namespace App\Http\Controllers\Investors;

use App\Actions\Investor\CreateInvestorAction;
use App\Actions\Investor\UpdateInvestorAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Common\BulkDestroyRequest;
use App\Http\Requests\Investor\StoreInvestorRequest;
use App\Http\Requests\Investor\UpdateInvestorRequest;
use App\Models\Account;
use App\Models\Investor;
use App\Models\InvestorTransaction;
use App\Models\Settings;
use App\Queries\Investor\InvestorQuery;
use App\Support\BulkDelete;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvestorController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $investors = InvestorQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $investors->getCollection()->transform(fn (Investor $investor) => [
            'id' => $investor->id,
            'name' => $investor->name,
            'phone' => $investor->phone,
            'note' => $investor->note,
            'opening_amount' => $investor->opening_amount,
            'total_invested' => $investor->total_invested,
            'can_delete' => $investor->transactions_count === 0,
            'can_edit_opening_amount' => $investor->movements_count === 0,
        ]);

        return Inertia::render('investors/index', [
            'investors' => $investors,
            'totalInvested' => (float) Investor::query()->sum('total_invested'),
            'filters' => [
                'sort' => $validated['sort'] ?? 'name',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    /**
     * An Investor starts at 0 unless an opening capital is given (posted as
     * Dr Opening Balance Equity / Cr Capital, no account movement) — every
     * later change goes through AddInvestorTransactionAction.
     */
    public function store(StoreInvestorRequest $request, CreateInvestorAction $createInvestor): RedirectResponse
    {
        $createInvestor->execute($request->validated());

        return to_route('investors.index');
    }

    public function update(UpdateInvestorRequest $request, Investor $investor, UpdateInvestorAction $updateInvestor): RedirectResponse
    {
        $updateInvestor->execute($investor, $request->validated());

        return to_route('investors.index');
    }

    public function show(Investor $investor): Response
    {
        $runningBalance = 0.0;

        $rows = $investor->transactions()
            ->with(['account:id,name', 'creator:id,name'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (InvestorTransaction $transaction) use (&$runningBalance) {
                $runningBalance += $transaction->amount;

                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'amount' => $transaction->amount,
                    'account' => $transaction->account?->only(['id', 'name']),
                    'note' => $transaction->note,
                    'created_at' => $transaction->created_at->toDateString(),
                    'added_by' => $transaction->creator?->name,
                    'balance' => round($runningBalance, 2),
                ];
            });

        return Inertia::render('investors/show', [
            'investor' => [
                'id' => $investor->id,
                'name' => $investor->name,
                'total_invested' => $investor->total_invested,
            ],
            'transactions' => $rows,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Investors that already carry history are kept — corrections go
     * through a transaction, never a delete.
     */
    public function destroy(Investor $investor): RedirectResponse
    {
        if ($reason = $investor->deletionBlockReason()) {
            return back()->withErrors(['investor' => $reason]);
        }

        $investor->delete();

        return to_route('investors.index');
    }

    /**
     * "Delete selected" — each record is checked by the same rule as the single delete.
     */
    public function bulkDestroy(BulkDestroyRequest $request): RedirectResponse
    {
        return BulkDelete::respond(BulkDelete::run(
            $request->validated('ids'),
            Investor::query()->whereIn('id', $request->validated('ids'))->get(),
            fn (Investor $investor) => $investor->deletionBlockReason(),
            fn (Investor $investor) => $investor->delete(),
        ));
    }
}
