<?php

namespace App\Http\Requests\Products\WarrantyClaim;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreWarrantyClaimRequest extends FormRequest
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
            'sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'claim_date' => ['required', 'date'],
            'issue_description' => ['required', 'string', 'max:2000'],
        ];
    }
}
