<?php

namespace App\Http\Requests\Asset;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AssetTransactionRequest extends FormRequest
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
        $amountRule = $this->input('type') === 'adjustment'
            ? ['required', 'numeric']
            : ['required_if:type,purchase,addition', 'nullable', 'numeric', 'min:0.01'];

        return [
            'type' => ['required', 'in:purchase,addition,sold,disposal,adjustment'],
            'amount' => $amountRule,
            'sale_price' => ['required_if:type,sold', 'nullable', 'numeric', 'min:0'],
            'account_id' => ['required_unless:type,disposal,adjustment', 'nullable', 'integer', 'exists:accounts,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
