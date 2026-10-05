<?php

namespace Database\Seeders;

use App\Actions\Products\ServiceRequest\CreateServiceRequestAction;
use App\Enums\ServiceRequestStatus;
use App\Enums\ServiceRequestType;
use App\Models\SaleItem;
use App\Models\ServiceRequest;
use App\Models\Staff;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo service visits against a sold, installable unit: two covered by its free-service plan (one done, one
 * booked) and one that has outrun the free quota and is charged to the cash account. (Installation requests
 * come from the sales themselves — confirming a sale that needs installation creates them.)
 * Seeds once: skipped if the demo visits already exist.
 */
class ServiceRequestSeeder extends Seeder
{
    private const NOTE_PREFIX = 'Demo service:';

    public function run(): void
    {
        if (ServiceRequest::query()->where('note', 'like', self::NOTE_PREFIX.'%')->exists()) {
            $this->command?->warn('Demo service requests are already seeded — skipping ServiceRequestSeeder.');

            return;
        }

        // The sold units come from the demo sales; visits are assigned to demo staff.
        $this->call([SaleSeeder::class, StaffSeeder::class]);

        $acUnit = SaleItem::query()
            ->whereHas('product', fn ($query) => $query->where('sku', 'WAL-AC-15T'))
            ->whereHas('sale', fn ($query) => $query->where('status', 'confirmed'))
            ->first();

        if ($acUnit === null) {
            $this->command?->warn('No confirmed Walton AC sale found — skipping ServiceRequestSeeder.');

            return;
        }

        $technician = Staff::query()->where('name', 'Rafiqul Islam')->first();
        $createRequest = app(CreateServiceRequestAction::class);

        // Free visit #1 — already done.
        $createRequest->execute([
            'sale_item_id' => $acUnit->id,
            'request_date' => Carbon::today()->subDays(20)->toDateString(),
            'service_date' => Carbon::today()->subDays(18)->toDateString(),
            'staff_id' => $technician?->id,
            'status' => ServiceRequestStatus::Completed->value,
            'note' => self::NOTE_PREFIX.' gas top-up, free under the service plan',
        ]);

        // Free visit #2 — booked for a few days ahead.
        $createRequest->execute([
            'sale_item_id' => $acUnit->id,
            'request_date' => Carbon::today()->subDay()->toDateString(),
            'service_date' => Carbon::today()->addDays(3)->toDateString(),
            'staff_id' => $technician?->id,
            'status' => ServiceRequestStatus::Scheduled->value,
            'note' => self::NOTE_PREFIX.' filter cleaning visit',
        ]);

        // Free quota is used up now — this visit is charged and paid to the cash account.
        $createRequest->execute([
            'sale_item_id' => $acUnit->id,
            'request_date' => Carbon::today()->toDateString(),
            'staff_id' => $technician?->id,
            'account_id' => DemoLookup::accounts()['cash']->id,
            'charge_amount' => 800,
            'status' => ServiceRequestStatus::Pending->value,
            'note' => self::NOTE_PREFIX.' extra visit beyond the free quota',
        ]);

        // Make sure the type the demo relies on is what the action wrote.
        ServiceRequest::query()->where('note', 'like', self::NOTE_PREFIX.'%')->update(['type' => ServiceRequestType::Service->value]);
    }
}
