<?php

namespace App\Http\Controllers\Assets;

use App\Actions\Asset\AddAssetTransactionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asset\AssetTransactionRequest;
use App\Models\Asset;
use Illuminate\Http\RedirectResponse;

class AssetTransactionController extends Controller
{
    public function store(AssetTransactionRequest $request, Asset $asset, AddAssetTransactionAction $addTransaction): RedirectResponse
    {
        $addTransaction->execute($asset, $request->validated());

        return to_route('assets.show', $asset);
    }
}
