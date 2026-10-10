<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\SendContactNotificationAction;
use App\Enums\MessageChannel;
use App\Enums\MessageStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\Contact\SendContactNotificationRequest;
use App\Models\Campaign;
use App\Models\MessageLog;
use App\Services\SmsGateway;
use Illuminate\Http\RedirectResponse;

class ContactNotificationController extends Controller
{
    /**
     * Contacts-page bulk-select → "Send Notification" — one message, one
     * channel, to every selected contact.
     */
    public function store(SendContactNotificationRequest $request, SendContactNotificationAction $sendNotification, SmsGateway $sms): RedirectResponse
    {
        $data = $request->validated();

        $channel = MessageChannel::from($data['channel']);

        // Nothing is promised for SMS unless a company is set up: say so instead of recording messages that cannot go out.
        if ($channel === MessageChannel::Sms && ! $sms->isConfigured()) {
            return back()->withErrors(['channel' => 'SMS is not set up yet. Turn it on in Business Settings → SMS first.']);
        }

        $campaign = $sendNotification->execute($data['ids'], $channel, $data['message'], $data['subject'] ?? null, $request->user()->id);

        $failed = MessageLog::query()->where('reference_type', Campaign::class)->where('reference_id', $campaign->id)->where('status', MessageStatus::Failed);

        if ($channel === MessageChannel::Sms && $failed->exists()) {
            $total = count(array_unique($data['ids']));
            $reasons = $failed->pluck('error')->unique()->take(2)->implode(' ');

            return back()->withErrors(['sms' => ($total - $failed->count()).' of '.$total.' sent. '.$reasons]);
        }

        return back();
    }
}
