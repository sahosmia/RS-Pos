<?php

namespace App\Http\Requests\Sales\Emi;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PayEmiInstallmentRequest extends FormRequest
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
            'account_id' => ['required', 'integer', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
