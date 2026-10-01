<?php

namespace App\Actions\Asset;

use App\Enums\AssetTransactionType;
use App\Models\Asset;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAssetAction
{
    public function __construct(
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
        private AddAssetTransactionAction $addTransaction,
    ) {}

    /**
     * One step, never create-then-purchase:
     *  - `existing` (default): an asset owned before the system. `opening_value` is optional —
     *    blank/0 simply creates the asset with no value and no journal entry. No account moves.
     *  - `new`: bought today. Recorded as a purchase, so the chosen account is debited.
     *
     * @param  array{asset_type?: string, name: string, purchase_date?: string|null, opening_value?: float|string|null, purchase_amount?: float|string|null, account_id?: int|string|null}  $data
     */
    public function execute(array $data): Asset
    {
        return DB::transaction(function () use ($data) {
            $asset = Asset::create([
                'name' => $data['name'],
                'purchase_date' => $data['purchase_date'] ?? null,
                'created_by' => Auth::id(),
            ]);

            if (($data['asset_type'] ?? 'existing') === 'new') {
                $this->addTransaction->execute($asset, [
                    'type' => AssetTransactionType::Purchase->value,
                    'amount' => $data['purchase_amount'],
                    'account_id' => $data['account_id'],
                    'note' => 'New asset',
                ]);

                return $asset->fresh();
            }

            $openingValue = round((float) ($data['opening_value'] ?? 0), 2);

            if ($openingValue !== 0.0) {
                $asset->update(['opening_value' => $openingValue]);
                $asset->addLedgerTransaction(AssetTransactionType::OpeningAsset->value, $openingValue);

                $this->journal->postOpeningBalance(
                    today(),
                    $this->chartOfAccounts->code('1400'),
                    $this->chartOfAccounts->code('3300'),
                    $openingValue,
                    'asset_opening_value',
                    $asset->id,
                    "Opening value: {$asset->name}",
                );
            }

            return $asset->fresh();
        });
    }
}
