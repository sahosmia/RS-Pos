<?php

namespace App\Actions\Asset;

use App\Enums\AccountTransactionType;
use App\Enums\AssetTransactionType;
use App\Exceptions\AssetAlreadyDisposedException;
use App\Models\Account;
use App\Models\Asset;
use App\Models\AssetTransaction;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Every transaction type after opening (that one's set at creation, see
 * CreateAssetAction) — purchase/addition grow current_value, sold/disposal
 * drop it to 0. Unlike Product, an asset can't be partially sold: "sold"
 * and "disposal" always remove the asset's entire remaining book value.
 */
class AddAssetTransactionAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{type: string, amount?: float|string|null, sale_price?: float|string|null, account_id?: int|string|null, note?: string|null}  $data
     *
     * @throws AssetAlreadyDisposedException
     */
    public function execute(Asset $asset, array $data): AssetTransaction
    {
        $type = AssetTransactionType::from($data['type']);

        return DB::transaction(fn () => match ($type) {
            AssetTransactionType::Purchase, AssetTransactionType::Addition => $this->recordGrowth($asset, $type, $data),
            AssetTransactionType::Sold => $this->recordSold($asset, $data),
            AssetTransactionType::Disposal => $this->recordDisposal($asset, $data),
            AssetTransactionType::OpeningAsset => throw new InvalidArgumentException('Opening value is set when the asset is created, not added later.'),
        });
    }

    private function recordGrowth(Asset $asset, AssetTransactionType $type, array $data): AssetTransaction
    {
        $amount = round((float) $data['amount'], 2);
        $account = Account::findOrFail($data['account_id']);
        $note = $data['note'] ?? null;

        $transaction = $asset->addLedgerTransaction($type->value, $amount, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::AssetPurchase, -$amount, today(), 'asset', $asset->id, $note);

        $fixedAssets = $this->chartOfAccounts->code('1400');
        $label = $type === AssetTransactionType::Purchase ? 'Asset purchased' : 'Asset addition';

        $this->journal->post(today(), "{$label}: {$asset->name}", [
            ['chart_of_account_id' => $fixedAssets->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'asset', $asset->id);

        return $transaction;
    }

    /**
     * @throws AssetAlreadyDisposedException
     */
    private function recordSold(Asset $asset, array $data): AssetTransaction
    {
        $bookValue = round((float) $asset->current_value, 2);

        if ($bookValue <= 0.0) {
            throw new AssetAlreadyDisposedException($asset);
        }

        $salePrice = round((float) $data['sale_price'], 2);
        $account = Account::findOrFail($data['account_id']);
        $note = $data['note'] ?? null;

        $transaction = $asset->addLedgerTransaction(AssetTransactionType::Sold->value, -$bookValue, $account->id, $note);

        $this->accounts->record($account, AccountTransactionType::AssetSale, $salePrice, today(), 'asset', $asset->id, $note);

        $fixedAssets = $this->chartOfAccounts->code('1400');
        $lines = [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $salePrice, 'credit' => 0],
            ['chart_of_account_id' => $fixedAssets->id, 'debit' => 0, 'credit' => $bookValue],
        ];

        // Gain/loss = sale price − book value (পর্ব ৮ Gain/Loss on Sale).
        $gainOrLoss = round($salePrice - $bookValue, 2);

        if ($gainOrLoss > 0.0) {
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->code('4300')->id, 'debit' => 0, 'credit' => $gainOrLoss];
        } elseif ($gainOrLoss < 0.0) {
            $lines[] = ['chart_of_account_id' => $this->chartOfAccounts->code('5950')->id, 'debit' => abs($gainOrLoss), 'credit' => 0];
        }

        $this->journal->post(today(), "Asset sold: {$asset->name}", $lines, 'asset', $asset->id);

        return $transaction;
    }

    /**
     * A write-off — no cash recovered, so the entire book value becomes a
     * loss.
     *
     * @throws AssetAlreadyDisposedException
     */
    private function recordDisposal(Asset $asset, array $data): AssetTransaction
    {
        $bookValue = round((float) $asset->current_value, 2);

        if ($bookValue <= 0.0) {
            throw new AssetAlreadyDisposedException($asset);
        }

        $note = $data['note'] ?? null;
        $transaction = $asset->addLedgerTransaction(AssetTransactionType::Disposal->value, -$bookValue, null, $note);

        $this->journal->post(today(), "Asset disposed: {$asset->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->code('5950')->id, 'debit' => $bookValue, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->code('1400')->id, 'debit' => 0, 'credit' => $bookValue],
        ], 'asset', $asset->id);

        return $transaction;
    }
}
