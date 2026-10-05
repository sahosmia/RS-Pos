<?php

namespace Database\Seeders;

use App\Enums\WarrantyClaimStatus;
use App\Models\SaleItem;
use App\Models\WarrantyClaim;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo warranty claims on sold units still inside their warranty: one just filed, one being looked at and one
 * resolved. Seeds once: skipped if the demo claims already exist.
 */
class WarrantyClaimSeeder extends Seeder
{
    public function run(): void
    {
        if (WarrantyClaim::query()->where('issue_description', 'like', 'Demo claim:%')->exists()) {
            $this->command?->warn('Demo warranty claims are already seeded — skipping WarrantyClaimSeeder.');

            return;
        }

        $this->call(SaleSeeder::class);

        // Sold units of products that carry a warranty, newest sale first.
        $units = SaleItem::query()
            ->whereHas('product', fn ($query) => $query->whereNotNull('warranty_period_months'))
            ->whereHas('sale', fn ($query) => $query->where('status', 'confirmed'))
            ->latest('id')
            ->get()
            ->unique('product_id')
            ->values();

        $claims = [
            [WarrantyClaimStatus::Pending, 'Demo claim: unit makes a rattling noise after a week', null, 2],
            [WarrantyClaimStatus::InProgress, 'Demo claim: cooling is weak, technician to inspect', null, 6],
            [WarrantyClaimStatus::Resolved, 'Demo claim: remote control stopped working', 'Replaced the remote under warranty', 15],
        ];

        foreach ($claims as $index => [$status, $issue, $resolution, $daysAgo]) {
            $unit = $units->get($index);

            if ($unit === null) {
                break;
            }

            WarrantyClaim::create([
                'sale_item_id' => $unit->id,
                'claim_date' => Carbon::today()->subDays($daysAgo)->toDateString(),
                'issue_description' => $issue,
                'status' => $status->value,
                'resolution_note' => $resolution,
            ]);
        }
    }
}
