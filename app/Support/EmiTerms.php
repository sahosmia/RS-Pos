<?php

namespace App\Support;

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use App\Services\EmiCalculator;

/**
 * Turns the financing fields of a sale form into the `sales` columns that store them. One place, shared by
 * Create and Update, so the two can't disagree about what a given set of terms means.
 *
 * Tenure drives everything when it is given: `installment_count` is then *derived* (12 months paid monthly = 12)
 * and any count the client sent is ignored. A sale with only an `installment_count` (the older form) keeps the
 * original behaviour: that many equal monthly installments, no interest.
 */
class EmiTerms
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function columns(array $data): array
    {
        $none = [
            'financing_type' => 'one_time',
            'installment_count' => null,
            'emi_interest_method' => null,
            'emi_annual_rate' => 0,
            'emi_frequency' => null,
            'emi_tenure_value' => null,
            'emi_tenure_unit' => null,
            'emi_installation_upfront' => false,
        ];

        if (($data['financing_type'] ?? 'one_time') !== 'emi') {
            return $none;
        }

        if (empty($data['emi_tenure_value'])) {
            return [...$none, 'financing_type' => 'emi', 'installment_count' => $data['installment_count'] ?? null];
        }

        $method = EmiInterestMethod::tryFrom((string) ($data['emi_interest_method'] ?? '')) ?? EmiInterestMethod::None;
        $frequency = EmiFrequency::tryFrom((string) ($data['emi_frequency'] ?? '')) ?? EmiFrequency::Monthly;
        $unit = EmiTenureUnit::tryFrom((string) ($data['emi_tenure_unit'] ?? '')) ?? EmiTenureUnit::Months;
        $tenure = (int) $data['emi_tenure_value'];

        return [
            'financing_type' => 'emi',
            'installment_count' => app(EmiCalculator::class)->periodsFor($tenure, $unit, $frequency),
            'emi_interest_method' => $method->value,
            'emi_annual_rate' => $method === EmiInterestMethod::None ? 0 : (float) ($data['emi_annual_rate'] ?? 0),
            'emi_frequency' => $frequency->value,
            'emi_tenure_value' => $tenure,
            'emi_tenure_unit' => $unit->value,
            'emi_installation_upfront' => (bool) ($data['emi_installation_upfront'] ?? false),
        ];
    }
}
