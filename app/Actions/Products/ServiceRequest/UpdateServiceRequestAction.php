<?php

namespace App\Actions\Products\ServiceRequest;

use App\Enums\AccountTransactionType;
use App\Enums\JournalEntryStatus;
use App\Enums\ServiceRequestStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\ServiceRequest;
use App\Services\AccountService;
use App\Services\JournalService;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Moves a service request along (pending → scheduled → completed, or cancelled) and records who did the job and
 * when. Completed and Cancelled are final. Cancelling a request that took money gives that money back: the
 * charge is taken out of the account again and its journal entry is reversed, never deleted.
 */
class UpdateServiceRequestAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
    ) {}

    /**
     * @param  array{status: string, staff_id?: int|null, service_date?: string|null, note?: string|null}  $data
     */
    public function execute(ServiceRequest $serviceRequest, array $data): ServiceRequest
    {
        return DB::transaction(function () use ($serviceRequest, $data) {
            $serviceRequest = ServiceRequest::query()->lockForUpdate()->findOrFail($serviceRequest->id);
            $status = ServiceRequestStatus::from($data['status']);

            // Idempotent: pressing "Complete" twice must not do anything the second time.
            if ($serviceRequest->status === $status && $serviceRequest->status->isFinal()) {
                return $serviceRequest;
            }

            $serviceRequest->fill([
                'status' => $status,
                'staff_id' => array_key_exists('staff_id', $data) ? $data['staff_id'] : $serviceRequest->staff_id,
                'service_date' => $data['service_date'] ?? $this->defaultServiceDate($serviceRequest, $status),
                'note' => array_key_exists('note', $data) ? $data['note'] : $serviceRequest->note,
            ])->save();

            if ($status === ServiceRequestStatus::Cancelled) {
                $this->refundCharge($serviceRequest);
            }

            return $serviceRequest->fresh();
        });
    }

    /**
     * The date kept when none is sent. A job cannot have been done in the future, so completing one that was booked
     * for a later day records today instead of the booked day.
     */
    private function defaultServiceDate(ServiceRequest $serviceRequest, ServiceRequestStatus $status): CarbonInterface
    {
        if ($status === ServiceRequestStatus::Completed && ($serviceRequest->service_date === null || $serviceRequest->service_date->isFuture())) {
            return today();
        }

        return $serviceRequest->service_date ?? today();
    }

    private function refundCharge(ServiceRequest $serviceRequest): void
    {
        if ($serviceRequest->is_free || $serviceRequest->charge_amount <= 0 || $serviceRequest->account_id === null) {
            return;
        }

        $this->accounts->record(
            Account::findOrFail($serviceRequest->account_id),
            AccountTransactionType::ServiceCharge,
            -$serviceRequest->charge_amount,
            today(),
            'service_request',
            $serviceRequest->id,
            'Reversal: service request cancelled',
        );

        JournalEntry::query()
            ->where('reference_type', 'service_request')
            ->where('reference_id', $serviceRequest->id)
            ->where('status', JournalEntryStatus::Posted->value)
            ->get()
            ->each(fn (JournalEntry $entry) => $this->journal->reverse($entry, 'Service request cancelled'));
    }
}
