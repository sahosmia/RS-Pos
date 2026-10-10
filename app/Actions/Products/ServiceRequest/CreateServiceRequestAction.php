<?php

namespace App\Actions\Products\ServiceRequest;

use App\Enums\AccountTransactionType;
use App\Enums\ServiceRequestStatus;
use App\Enums\ServiceRequestType;
use App\Models\Account;
use App\Models\SaleItem;
use App\Models\ServiceRequest;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * A `service` visit (free or paid, decided here server-side from the sold unit's current service period) or an
 * `installation` done later (never free). Installation is also auto-created at Sale confirm time, see
 * ConfirmSaleAction. Never trusts a client-submitted is_free flag.
 */
class CreateServiceRequestAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{sale_item_id: int, type?: string, request_date: string, service_date?: string|null, staff_id?: int|null, account_id?: int|string|null, charge_amount?: float|string|null, status?: string, note?: string|null}  $data
     */
    public function execute(array $data): ServiceRequest
    {
        return DB::transaction(function () use ($data) {
            $saleItem = SaleItem::with('product')->findOrFail($data['sale_item_id']);
            $type = ServiceRequestType::tryFrom((string) ($data['type'] ?? '')) ?? ServiceRequestType::Service;

            // Only a service visit uses the free quota; an installation is never free (its charge, if any, is billed here).
            $isFree = $type === ServiceRequestType::Service && $saleItem->isNextServiceFree();
            $chargeAmount = $isFree ? 0.0 : round((float) ($data['charge_amount'] ?? 0), 2);

            $serviceRequest = $saleItem->serviceRequests()->create([
                'request_date' => $data['request_date'],
                'service_date' => $data['service_date'] ?? $data['request_date'],
                'type' => $type,
                'is_free' => $isFree,
                'charge_amount' => $chargeAmount,
                'account_id' => $isFree ? null : ($data['account_id'] ?? null),
                'staff_id' => $data['staff_id'] ?? null,
                'status' => $data['status'] ?? ServiceRequestStatus::Pending,
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            if (! $isFree && $chargeAmount > 0.0 && ! empty($data['account_id'])) {
                $this->postCharge($saleItem, $serviceRequest, $chargeAmount, $data['account_id']);
            }

            return $serviceRequest->fresh();
        });
    }

    /**
     * Same Account integration pattern as every other money-in event, plus
     * V2 journal posting (Dr {account} / Cr 4200 Service/Installation
     * Income).
     */
    private function postCharge(SaleItem $saleItem, ServiceRequest $serviceRequest, float $amount, int|string $accountId): void
    {
        $account = Account::findOrFail($accountId);
        $this->accounts->record($account, AccountTransactionType::ServiceCharge, $amount, today(), 'service_request', $serviceRequest->id);

        $income = $this->chartOfAccounts->code('4200');
        $this->journal->post(today(), "Service charge: {$saleItem->product->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $income->id, 'debit' => 0, 'credit' => $amount],
        ], 'service_request', $serviceRequest->id);
    }
}
