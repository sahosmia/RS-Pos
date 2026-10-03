<?php

namespace App\Http\Controllers\Assets;

use App\Actions\Asset\CreateAssetAction;
use App\Actions\Asset\UpdateAssetAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asset\StoreAssetRequest;
use App\Http\Requests\Asset\UpdateAssetRequest;
use App\Models\Account;
use App\Models\Asset;
use App\Models\AssetTransaction;
use App\Models\Settings;
use App\Queries\Asset\AssetQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'string', 'max:10'],
            'sort' => ['nullable', 'string', 'max:50'],
            'direction' => ['nullable', 'in:asc,desc'],
        ]);

        $resolvedPerPage = Settings::resolveRequestedPerPage($validated['per_page'] ?? null);

        $assets = AssetQuery::filtered($validated)
            ->paginate($resolvedPerPage ?? Settings::MAX_UNPAGINATED_ROWS)
            ->withQueryString();

        $assets->getCollection()->transform(fn (Asset $asset) => [
            'id' => $asset->id,
            'name' => $asset->name,
            'opening_value' => $asset->opening_value,
            'current_value' => $asset->current_value,
            'purchase_date' => $asset->purchase_date?->toDateString(),
            'can_delete' => $asset->transactions_count === 0,
            'can_edit_opening_value' => $asset->movements_count === 0,
        ]);

        return Inertia::render('assets/index', [
            'assets' => $assets,
            'totalValue' => (float) Asset::query()->sum('current_value'),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
            'filters' => [
                'sort' => $validated['sort'] ?? 'name',
                'direction' => $validated['direction'] ?? 'asc',
                'per_page' => $resolvedPerPage ?? 'all',
            ],
        ]);
    }

    public function store(StoreAssetRequest $request, CreateAssetAction $createAsset): RedirectResponse
    {
        $createAsset->execute($request->validated());

        return to_route('assets.index');
    }

    public function update(UpdateAssetRequest $request, Asset $asset, UpdateAssetAction $updateAsset): RedirectResponse
    {
        $updateAsset->execute($asset, $request->validated());

        return to_route('assets.index');
    }

    /**
     * Detail + ledger — full transaction history with a running balance.
     */
    public function show(Asset $asset): Response
    {
        $runningBalance = 0.0;

        $rows = $asset->transactions()
            ->with(['account:id,name', 'creator:id,name'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (AssetTransaction $transaction) use (&$runningBalance) {
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

        return Inertia::render('assets/show', [
            'asset' => [
                'id' => $asset->id,
                'name' => $asset->name,
                'current_value' => $asset->current_value,
                'purchase_date' => $asset->purchase_date?->toDateString(),
            ],
            'transactions' => $rows,
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Assets that already carry history are kept — corrections go through a
     * transaction (sold/disposal), never a delete.
     */
    public function destroy(Asset $asset): RedirectResponse
    {
        if ($asset->transactions()->exists()) {
            return back()->withErrors([
                'asset' => 'This asset has recorded transactions and cannot be deleted.',
            ]);
        }

        $asset->delete();

        return to_route('assets.index');
    }
}
