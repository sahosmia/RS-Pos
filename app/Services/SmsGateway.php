<?php

namespace App\Services;

use App\Models\Settings;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Sends one SMS through whichever company the shop set up in Business Settings → SMS. There is no company hard-coded
 * here: the settings say where the HTTP API lives, which words it uses for the key / sender / number / message, and
 * what its "sent" answer looks like — so switching SMS company is a settings change, not a code change.
 */
class SmsGateway
{
    /** Longest wait for the company's server, so one slow answer cannot freeze a whole bulk send. */
    private const TIMEOUT_SECONDS = 15;

    /** @var array{ok: bool, detail: string} */
    public const NOT_SET_UP = ['ok' => false, 'detail' => 'SMS is not set up. Turn it on in Business Settings → SMS.'];

    public function isConfigured(?Settings $settings = null): bool
    {
        $settings ??= Settings::currentOrNull();

        return $settings !== null && $settings->sms_enabled && filled($settings->sms_gateway_url);
    }

    /**
     * @return array{ok: bool, detail: string}
     */
    public function send(string $phone, string $message, ?Settings $settings = null): array
    {
        $settings ??= Settings::currentOrNull();

        if ($settings === null || ! $this->isConfigured($settings)) {
            return self::NOT_SET_UP;
        }

        $number = $this->formatPhone($phone, $settings->sms_phone_format);

        if ($number === null) {
            return ['ok' => false, 'detail' => 'No usable phone number.'];
        }

        $params = [
            ...$this->extraParams((string) $settings->sms_extra_params),
            $settings->sms_phone_param => $number,
            $settings->sms_message_param => $message,
        ];

        if (filled($settings->sms_sender_id) && filled($settings->sms_sender_param)) {
            $params[$settings->sms_sender_param] = $settings->sms_sender_id;
        }

        $key = (string) $settings->sms_api_key;
        $request = Http::timeout(self::TIMEOUT_SECONDS)->connectTimeout(5)->acceptJson();

        if ($key !== '') {
            if ($settings->sms_auth_mode === 'bearer') {
                $request = $request->withToken($key);
            } elseif (filled($settings->sms_api_key_param)) {
                $params[$settings->sms_api_key_param] = $key;
            }
        }

        try {
            $response = strtoupper($settings->sms_http_method) === 'POST'
                ? $request->asForm()->post($settings->sms_gateway_url, $params)
                : $request->get($settings->sms_gateway_url, $params);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'detail' => 'Could not reach the SMS company: '.Str::limit($e->getMessage(), 120)];
        }

        $body = trim((string) $response->body());
        $answered = $response->successful();

        // When the company's "sent" answer is known, it must appear in the reply; otherwise a 2xx status is enough.
        $expected = trim((string) $settings->sms_success_text);
        $ok = $answered && ($expected === '' || str_contains($body, $expected));

        return ['ok' => $ok, 'detail' => $ok ? 'Sent.' : 'The SMS company answered: '.Str::limit($body !== '' ? $body : 'HTTP '.$response->status(), 160)];
    }

    /**
     * 01712345678 / +8801712345678 / 8801712345678 → the form the company wants. Null when it is not a phone number.
     */
    public function formatPhone(string $phone, ?string $format): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (strlen($digits) < 10) {
            return null;
        }

        // Normalise to the local form first (01XXXXXXXXX), then to what was asked for.
        $local = str_starts_with($digits, '880') ? '0'.substr($digits, 3) : (str_starts_with($digits, '0') ? $digits : '0'.$digits);

        return $format === 'local' ? $local : '88'.$local;
    }

    /**
     * "type=text" lines (one per line) → ['type' => 'text'].
     *
     * @return array<string, string>
     */
    private function extraParams(string $text): array
    {
        $params = [];

        foreach (preg_split('/\R/', $text) ?: [] as $line) {
            [$name, $value] = array_pad(explode('=', trim($line), 2), 2, '');

            if (trim($name) !== '') {
                $params[trim($name)] = trim($value);
            }
        }

        return $params;
    }
}
