<?php

namespace App\Actions\Contact;

use App\Enums\CampaignStatus;
use App\Enums\CampaignTargetType;
use App\Enums\MessageChannel;
use App\Enums\MessageStatus;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\MessageLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The Contacts-page bulk-select "Send Notification" flow — records a
 * Campaign + one CampaignRecipient per contact (deduped via firstOrCreate,
 * per the UNIQUE(campaign_id, contact_id) constraint) and a MessageLog per
 * send.
 *
 * No SMS/WhatsApp/Email gateway is integrated yet, so the "send" is a
 * log-only stub that immediately marks everything Sent — same deferred
 * pattern as `reconciliation:check`. Swapping in a real gateway later only
 * touches the loop body below; the campaign/recipient/log bookkeeping
 * around it doesn't change.
 *
 * @param  list<int>  $contactIds
 */
class SendContactNotificationAction
{
    public function execute(array $contactIds, MessageChannel $channel, string $message, ?string $subject, ?int $createdBy): Campaign
    {
        return DB::transaction(function () use ($contactIds, $channel, $message, $subject, $createdBy) {
            $campaign = Campaign::create([
                'title' => Str::limit($message, 60),
                'message' => $message,
                'channel' => $channel,
                'target_type' => CampaignTargetType::CustomSelection,
                'status' => CampaignStatus::Sending,
                'created_by' => $createdBy,
            ]);

            foreach (array_unique($contactIds) as $contactId) {
                $recipient = CampaignRecipient::firstOrCreate([
                    'campaign_id' => $campaign->id,
                    'contact_id' => $contactId,
                ]);

                MessageLog::create([
                    'contact_id' => $contactId,
                    'channel' => $channel,
                    'subject' => $subject,
                    'message' => $message,
                    'status' => MessageStatus::Sent,
                    'reference_type' => Campaign::class,
                    'reference_id' => $campaign->id,
                    'sent_at' => now(),
                    'created_by' => $createdBy,
                ]);

                $recipient->update(['status' => MessageStatus::Sent, 'sent_at' => now()]);
            }

            $campaign->update(['status' => CampaignStatus::Completed]);

            return $campaign;
        });
    }
}
