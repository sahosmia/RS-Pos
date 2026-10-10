<?php

namespace App\Http\Requests\Products\ServiceRequest;

use App\Enums\ServiceRequestStatus;
use App\Models\ServiceRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateServiceRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ServiceRequestStatus::class)],
            'staff_id' => ['nullable', 'integer', 'exists:staff,id'],
            'service_date' => ['nullable', 'date', Rule::requiredIf(fn () => $this->input('status') === ServiceRequestStatus::Scheduled->value)],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'service_date.required' => 'Choose the date the service is booked for.',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var ServiceRequest $serviceRequest */
            $serviceRequest = $this->route('service_request');
            $target = ServiceRequestStatus::from($this->input('status'));

            if ($serviceRequest->status->isFinal()) {
                $validator->errors()->add('status', "This request is already {$serviceRequest->status->value} and can no longer be changed.");

                return;
            }

            // Saving details without moving on (e.g. assigning a technician while still pending) is fine.
            if ($target !== $serviceRequest->status && ! in_array($target, $serviceRequest->status->nextStatuses(), true)) {
                $validator->errors()->add('status', "A {$serviceRequest->status->value} request cannot go straight to {$target->value}.");
            }
        }];
    }
}
