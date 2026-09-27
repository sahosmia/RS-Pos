<?php

namespace App\Http\Requests\Products\WarrantyClaim;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreWarrantyClaimRequest extends FormRequest
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
            'sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'claim_date' => ['required', 'date'],
            'issue_description' => ['required', 'string', 'max:2000'],
        ];
    }
}
