<?php

namespace App\Http\Requests\Investor;

use App\Models\Investor;
use App\Rules\InvestorOpeningAmountEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInvestorRequest extends FormRequest
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
        /** @var Investor $investor */
        $investor = $this->route('investor');

        return [
            'name' => ['required', 'string', 'max:255'],
            'opening_amount' => ['required', 'numeric', 'min:0', new InvestorOpeningAmountEditable($investor)],
        ];
    }
}
