<?php

namespace Database\Seeders;

use App\Actions\Contact\SendContactNotificationAction;
use App\Enums\MessageChannel;
use App\Models\Campaign;
use Database\Seeders\Support\DemoLookup;
use Illuminate\Database\Seeder;

/**
 * Two demo "Send Notification" runs from the Contacts page — an SMS payment reminder and a WhatsApp offer — so
 * the campaign, recipient and message-log tables have rows. Seeds once: skipped if the demo campaigns exist.
 */
class CampaignSeeder extends Seeder
{
    private const REMINDER = 'Dear customer, your payment is due. Please settle it at your earliest convenience. — Demo reminder';

    private const OFFER = 'Eid offer: up to 10% off on refrigerators and ACs this week. — Demo offer';

    public function run(): void
    {
        if (Campaign::query()->where('message', self::REMINDER)->exists()) {
            $this->command?->warn('Demo campaigns are already seeded — skipping CampaignSeeder.');

            return;
        }

        $this->call(CustomerSeeder::class);

        $customerIds = array_map(fn ($customer) => $customer->id, DemoLookup::customers());
        $send = app(SendContactNotificationAction::class);

        $send->execute(array_slice($customerIds, 0, 3), MessageChannel::Sms, self::REMINDER, null, null);
        $send->execute($customerIds, MessageChannel::Whatsapp, self::OFFER, null, null);
    }
}
