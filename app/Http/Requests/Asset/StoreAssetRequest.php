<?php

namespace App\Http\Requests\Asset;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `existing` — an asset already owned before the system: an optional `opening_value`
     * (blank = 0), no account involved. `new` — bought today: `purchase_amount` is paid
     * out of `account_id`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'asset_type' => ['required', 'in:existing,new'],
            'name' => ['required', 'string', 'max:255'],
            'purchase_date' => ['nullable', 'date'],
            'opening_value' => ['exclude_unless:asset_type,existing', 'nullable', 'numeric', 'min:0'],
            'purchase_amount' => ['exclude_unless:asset_type,new', 'required', 'numeric', 'min:0.01'],
            'account_id' => ['exclude_unless:asset_type,new', 'required', 'integer', 'exists:accounts,id'],
        ];
    }
}
