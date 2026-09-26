<?php

namespace App\Http\Requests\Contacts\Contact;

use App\Enums\MessageChannel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendContactNotificationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:contacts,id'],
            'channel' => ['required', Rule::enum(MessageChannel::class)],
            'subject' => ['nullable', 'string', 'max:255', 'required_if:channel,email'],
            'message' => ['required', 'string', 'max:1000'],
        ];
    }
}
