<?php

namespace App\Http\Requests\Sales\Emi;

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use App\Http\Requests\Sales\Concerns\ValidatesEmiTerms;
use App\Services\EmiCalculator;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CalculateEmiRequest extends FormRequest
{
    use ValidatesEmiTerms;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $pricesInterest = fn () => in_array($this->input('method'), [EmiInterestMethod::Flat->value, EmiInterestMethod::Reducing->value], true);

        return [
            'sale_total' => ['required', 'numeric', 'gt:0'],
            // Installation is billed on top of the goods and is NOT financed: it is kept out of the financed amount
            // (and out of the interest) and stays a separate due. `sale_total` still includes it.
            'installation' => ['nullable', 'numeric', 'min:0', 'lte:sale_total'],
            // The goods (after discount) on the products chosen for EMI. Defaults to all the goods; the rest is paid now.
            'financed_goods' => ['nullable', 'numeric', 'gt:0', 'lte:sale_total'],
            // The down payment, taken off the financed goods.
            'down_payment' => ['nullable', 'numeric', 'min:0'],
            'method' => ['nullable', Rule::enum(EmiInterestMethod::class)],
            'annual_rate' => ['nullable', Rule::requiredIf($pricesInterest), 'numeric', 'min:0', 'max:100', Rule::when($pricesInterest, ['gt:0'])],
            'tenure_value' => ['required', 'integer', 'min:1', 'max:'.(self::MAX_INSTALLMENTS * 31)],
            'tenure_unit' => ['required', Rule::enum(EmiTenureUnit::class)],
            'frequency' => ['nullable', Rule::enum(EmiFrequency::class)],
            'sale_date' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'installation.lte' => 'The installation charge cannot be more than the total.',
            'annual_rate.gt' => 'Enter an interest rate above 0, or choose "No interest".',
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

            $goods = round((float) $this->input('sale_total') - (float) $this->input('installation', 0), 2);
            $financedGoods = $this->filled('financed_goods') ? min((float) $this->input('financed_goods'), $goods) : $goods;

            if ((float) $this->input('down_payment', 0) >= $financedGoods) {
                $validator->errors()->add('down_payment', 'The down payment must be less than the price of the EMI products (other products and the installation charge are not financed).');

                return;
            }

            $periods = app(EmiCalculator::class)->periodsFor(
                (int) $this->input('tenure_value'),
                EmiTenureUnit::from($this->input('tenure_unit')),
                EmiFrequency::tryFrom((string) $this->input('frequency')) ?? EmiFrequency::Monthly,
            );

            if ($periods > self::MAX_INSTALLMENTS) {
                $validator->errors()->add('tenure_value', "That duration makes {$periods} installments. The most allowed is ".self::MAX_INSTALLMENTS.'.');
            }
        }];
    }
}
