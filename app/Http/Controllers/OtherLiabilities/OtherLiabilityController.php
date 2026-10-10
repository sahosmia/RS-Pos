<?php

namespace App\Http\Controllers\OtherLiabilities;

use App\Actions\OtherLiability\CreateOtherLiabilityAction;
use App\Actions\OtherLiability\UpdateOtherLiabilityAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Common\BulkDestroyRequest;
use App\Http\Requests\OtherLiability\StoreOtherLiabilityRequest;
use App\Http\Requests\OtherLiability\UpdateOtherLiabilityRequest;
use App\Models\Account;
use App\Models\OtherLiability;
use App\Models\OtherLiabilityTransaction;
use App\Models\Settings;
use App\Queries\OtherLiability\OtherLiabilityQuery;
use App\Support\BulkDelete;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OtherLiabilityController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $liabilities = OtherLiabilityQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $liabilities->getCollection()->transform(fn (OtherLiability $liability) => [
            'id' => $liability->id,
            'name' => $liability->name,
            'opening_amount' => $liability->opening_amount,
            'current_balance' => $liability->current_balance,
            'can_delete' => $liability->transactions_count === 0,
            'can_edit_opening_amount' => $liability->movements_count === 0,
        ]);

        return Inertia::render('other-liabilities/index', [
            'liabilities' => $liabilities,
            'totalBalance' => (float) OtherLiability::query()->sum('current_balance'),
            'filters' => [
                'sort' => $validated['sort'] ?? 'name',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function store(StoreOtherLiabilityRequest $request, CreateOtherLiabilityAction $createLiability): RedirectResponse
    {
        $createLiability->execute($request->validated());

        return to_route('other-liabilities.index');
    }

    public function update(UpdateOtherLiabilityRequest $request, OtherLiability $otherLiability, UpdateOtherLiabilityAction $updateLiability): RedirectResponse
    {
        $updateLiability->execute($otherLiability, $request->validated());

        return to_route('other-liabilities.index');
    }

    public function show(OtherLiability $otherLiability): Response
    {
        $runningBalance = 0.0;

        $rows = $otherLiability->transactions()
            ->with(['account:id,name', 'creator:id,name'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (OtherLiabilityTransaction $transaction) use (&$runningBalance) {
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

        return Inertia::render('other-liabilities/show', [
            'liability' => [
                'id' => $otherLiability->id,
                'name' => $otherLiability->name,
                'current_balance' => $otherLiability->current_balance,
            ],
            'transactions' => $rows,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Liabilities that already carry history are kept — corrections go
     * through a transaction, never a delete.
     */
    public function destroy(OtherLiability $otherLiability): RedirectResponse
    {
        if ($reason = $otherLiability->deletionBlockReason()) {
            return back()->withErrors(['other_liability' => $reason]);
        }

        $otherLiability->delete();

        return to_route('other-liabilities.index');
    }

    /**
     * "Delete selected" — each record is checked by the same rule as the single delete.
     */
    public function bulkDestroy(BulkDestroyRequest $request): RedirectResponse
    {
        return BulkDelete::respond(BulkDelete::run(
            $request->validated('ids'),
            OtherLiability::query()->whereIn('id', $request->validated('ids'))->get(),
            fn (OtherLiability $otherLiability) => $otherLiability->deletionBlockReason(),
            fn (OtherLiability $otherLiability) => $otherLiability->delete(),
        ));
    }
}
