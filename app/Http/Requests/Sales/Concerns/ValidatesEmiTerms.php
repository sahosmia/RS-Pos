<?php

namespace App\Http\Requests\Sales\Concerns;

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use App\Services\EmiCalculator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The financing fields shared by the Add Sale and Edit Sale requests (and the EMI calculator): validation
 * only. What the terms *mean* lives in `App\Support\EmiTerms` / `EmiCalculator`.
 */
trait ValidatesEmiTerms
{
    public const MAX_INSTALLMENTS = 360;

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function emiTermRules(): array
    {
        // The form always sends the EMI fields (with their defaults), also for a normal sale, and keeps whatever was
        // last typed into the payment-plan dialog. They only matter, and are only checked, when the sale really is on EMI.
        $isEmi = fn () => $this->input('financing_type') === 'emi';
        $pricesInterest = fn () => $isEmi() && in_array($this->input('emi_interest_method'), [EmiInterestMethod::Flat->value, EmiInterestMethod::Reducing->value], true);

        return [
            'financing_type' => ['nullable', 'in:one_time,emi'],
            // Only needed by the older form that sends a bare count; with a tenure the count is derived.
            'installment_count' => ['nullable', Rule::requiredIf(fn () => $this->input('financing_type') === 'emi' && ! $this->filled('emi_tenure_value')), 'integer', 'min:1', 'max:'.self::MAX_INSTALLMENTS],
            'emi_interest_method' => ['nullable', Rule::enum(EmiInterestMethod::class)],
            'emi_annual_rate' => ['nullable', Rule::requiredIf($pricesInterest), 'numeric', 'min:0', 'max:100', Rule::when($pricesInterest, ['gt:0'])],
            'emi_frequency' => ['nullable', Rule::enum(EmiFrequency::class)],
            'emi_tenure_value' => ['nullable', Rule::requiredIf(fn () => $isEmi() && ! $this->filled('installment_count')), 'integer', 'min:1', 'max:'.(self::MAX_INSTALLMENTS * 31)],
            'emi_tenure_unit' => ['nullable', Rule::enum(EmiTenureUnit::class)],
            'emi_installation_upfront' => ['nullable', 'boolean'],
        ];
    }

    /**
     * An EMI sale needs at least one product on EMI (every line is by default; a cashier can untick some, never all).
     */
    protected function validateEmiHasProducts(Validator $validator): void
    {
        if ($this->input('financing_type') !== 'emi' || ! $this->filled('emi_tenure_value')) {
            return;
        }

        $items = (array) $this->input('items', []);

        if ($items !== [] && collect($items)->every(fn ($item) => ! filter_var($item['emi_financed'] ?? true, FILTER_VALIDATE_BOOLEAN))) {
            $validator->errors()->add('items', 'Choose at least one product to put on EMI.');
        }
    }

    /**
     * Rejects a tenure that would produce an absurd number of installments (e.g. 400 weeks paid weekly is fine,
     * 60 years paid weekly is not).
     */
    protected function validateEmiPeriods(Validator $validator): void
    {
        if ($this->input('financing_type') !== 'emi' || ! $this->filled('emi_tenure_value') || ! $this->filled('emi_tenure_unit') || $validator->errors()->hasAny(['emi_tenure_value', 'emi_tenure_unit', 'emi_frequency'])) {
            return;
        }

        $periods = app(EmiCalculator::class)->periodsFor(
            (int) $this->input('emi_tenure_value'),
            EmiTenureUnit::from($this->input('emi_tenure_unit')),
            EmiFrequency::tryFrom((string) $this->input('emi_frequency')) ?? EmiFrequency::Monthly,
        );

        if ($periods > self::MAX_INSTALLMENTS) {
            $validator->errors()->add('emi_tenure_value', 'That duration makes '.$periods.' installments. The most allowed is '.self::MAX_INSTALLMENTS.'.');
        }
    }
}
