<?php

namespace App\Http\Requests\OtherLiability;

use App\Models\OtherLiability;
use App\Rules\OtherLiabilityOpeningAmountEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOtherLiabilityRequest extends FormRequest
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
        /** @var OtherLiability $otherLiability */
        $otherLiability = $this->route('other_liability');

        return [
            'name' => ['required', 'string', 'max:255'],
            'opening_amount' => ['required', 'numeric', 'min:0', new OtherLiabilityOpeningAmountEditable($otherLiability)],
        ];
    }
}
