<?php

namespace App\Http\Controllers\Contacts;

use App\Actions\Contact\SendContactNotificationAction;
use App\Enums\MessageChannel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\Contact\SendContactNotificationRequest;
use Illuminate\Http\RedirectResponse;

class ContactNotificationController extends Controller
{
    /**
     * Contacts-page bulk-select → "Send Notification" — one message, one
     * channel, to every selected contact.
     */
    public function store(SendContactNotificationRequest $request, SendContactNotificationAction $sendNotification): RedirectResponse
    {
        $data = $request->validated();

        $sendNotification->execute(
            $data['ids'],
            MessageChannel::from($data['channel']),
            $data['message'],
            $data['subject'] ?? null,
            $request->user()->id,
        );

        return back();
    }
}
