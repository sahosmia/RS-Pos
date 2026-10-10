<?php

namespace App\Actions\Contact;

use App\Enums\CampaignStatus;
use App\Enums\CampaignTargetType;
use App\Enums\MessageChannel;
use App\Enums\MessageStatus;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\MessageLog;
use App\Services\SmsGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The Contacts-page bulk-select "Send Notification" flow — records a Campaign + one CampaignRecipient per contact
 * (deduped via firstOrCreate, per the UNIQUE(campaign_id, contact_id) constraint) and a MessageLog per message.
 *
 * SMS is really sent, through the company set up in Business Settings → SMS (see SmsGateway); each message is Sent or
 * Failed according to what that company answered, and a failure keeps its reason. WhatsApp and email have no gateway
 * connected yet, so those are only recorded as Pending — never marked Sent — until one is.
 */
class SendContactNotificationAction
{
    public function __construct(private SmsGateway $sms) {}

    /**
     * @param  list<int>  $contactIds
     */
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

            $contacts = Contact::query()->whereIn('id', array_unique($contactIds))->get();
            $sentAny = false;

            foreach ($contacts as $contact) {
                $recipient = CampaignRecipient::firstOrCreate([
                    'campaign_id' => $campaign->id,
                    'contact_id' => $contact->id,
                ]);

                [$status, $error] = $this->deliver($channel, $contact, $message);
                $sentAny = $sentAny || $status === MessageStatus::Sent;

                MessageLog::create([
                    'contact_id' => $contact->id,
                    'channel' => $channel,
                    'subject' => $subject,
                    'message' => $message,
                    'status' => $status,
                    'error' => $error,
                    'reference_type' => Campaign::class,
                    'reference_id' => $campaign->id,
                    'sent_at' => $status === MessageStatus::Sent ? now() : null,
                    'created_by' => $createdBy,
                ]);

                $recipient->update(['status' => $status, 'sent_at' => $status === MessageStatus::Sent ? now() : null]);
            }

            // A campaign only counts as failed when nothing at all went out through a channel that really sends.
            $campaign->update(['status' => $channel === MessageChannel::Sms && ! $sentAny ? CampaignStatus::Failed : CampaignStatus::Completed]);

            return $campaign;
        });
    }

    /**
     * @return array{0: MessageStatus, 1: ?string}
     */
    private function deliver(MessageChannel $channel, Contact $contact, string $message): array
    {
        if ($channel !== MessageChannel::Sms) {
            return [MessageStatus::Pending, 'No '.$channel->value.' gateway is connected yet — recorded only.'];
        }

        if (blank($contact->phone)) {
            return [MessageStatus::Failed, 'This contact has no phone number.'];
        }

        $result = $this->sms->send((string) $contact->phone, $message);

        return $result['ok'] ? [MessageStatus::Sent, null] : [MessageStatus::Failed, $result['detail']];
    }
}
