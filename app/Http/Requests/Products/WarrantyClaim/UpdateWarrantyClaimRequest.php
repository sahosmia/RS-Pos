<?php

namespace App\Http\Requests\Products\WarrantyClaim;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWarrantyClaimRequest extends FormRequest
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
            'status' => ['required', 'in:pending,in_progress,resolved,rejected'],
            'resolution_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
