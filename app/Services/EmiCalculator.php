<?php

namespace App\Services;

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Pure EMI maths: no database, no clock. Money goes in and comes out in normal currency units (2 decimals),
 * but every calculation inside runs on whole minor units (paisa/cents) so installments always add up to the
 * cent. Parts are spread so they differ by at most one minor unit, and the grand totals are exact.
 *
 * The sale's down payment is *not* part of the schedule: the financed amount (principal) is the price minus
 * the down payment, and interest is charged on that only.
 */
class EmiCalculator
{
    /**
     * Number of installments for a tenure, e.g. 12 months paid monthly = 12, 6 months paid weekly = 26.
     * A tenure that doesn't divide evenly rounds up (90 days paid monthly = 3).
     */
    public function periodsFor(int $tenureValue, EmiTenureUnit $unit, EmiFrequency $frequency): int
    {
        // round() before ceil(): 11.9999999 (float noise) must come out as 12, not 13.
        return max(1, (int) ceil(round($unit->toYears($tenureValue) * $frequency->perYear(), 6)));
    }

    /**
     * @return array{periods: int, principal: float, interest_total: float, total_payable: float, installment_amount: float, schedule: list<array{number: int, due_date: string, opening_balance: float, principal: float, interest: float, amount: float, closing_balance: float}>}
     */
    public function calculate(
        float $financedAmount,
        EmiInterestMethod $method,
        float $annualRatePercent,
        int $periods,
        EmiFrequency $frequency,
        CarbonImmutable $firstDueDate,
    ): array {
        $principal = $this->toMinor($financedAmount);

        if ($principal <= 0) {
            throw new InvalidArgumentException('The financed amount must be greater than zero.');
        }

        if ($periods < 1) {
            throw new InvalidArgumentException('There must be at least one installment.');
        }

        $parts = match (true) {
            $method === EmiInterestMethod::Flat && $annualRatePercent > 0 => $this->flat($principal, $annualRatePercent, $periods, $frequency),
            $method === EmiInterestMethod::Reducing && $annualRatePercent > 0 => $this->reducing($principal, $annualRatePercent, $periods, $frequency),
            default => $this->even($principal, $periods),
        };

        $balance = $principal;
        $interestTotal = 0;
        $schedule = [];

        foreach ($parts as $index => [$principalPart, $interestPart]) {
            $closing = $balance - $principalPart;
            $interestTotal += $interestPart;

            $schedule[] = [
                'number' => $index + 1,
                'due_date' => $frequency->dueDate($firstDueDate, $index)->toDateString(),
                'opening_balance' => $this->fromMinor($balance),
                'principal' => $this->fromMinor($principalPart),
                'interest' => $this->fromMinor($interestPart),
                'amount' => $this->fromMinor($principalPart + $interestPart),
                'closing_balance' => $this->fromMinor($closing),
            ];

            $balance = $closing;
        }

        return [
            'periods' => $periods,
            'principal' => $this->fromMinor($principal),
            'interest_total' => $this->fromMinor($interestTotal),
            'total_payable' => $this->fromMinor($principal + $interestTotal),
            'installment_amount' => $schedule[0]['amount'],
            'schedule' => $schedule,
        ];
    }

    /**
     * Splits `$total` into `$parts` whole numbers that differ by at most 1 and add up exactly to `$total`.
     *
     * @return list<int>
     */
    public function spread(int $total, int $parts): array
    {
        $base = intdiv($total, $parts);
        $remainder = $total - $base * $parts;

        return array_map(fn (int $i) => $base + ($i < $remainder ? 1 : 0), range(0, $parts - 1));
    }

    /**
     * @return list<array{0: int, 1: int}>
     */
    private function even(int $principal, int $periods): array
    {
        return array_map(fn (int $part) => [$part, 0], $this->spread($principal, $periods));
    }

    /**
     * Flat rate: interest = principal x rate x (periods / periods per year), on the ORIGINAL principal, and the
     * installments are equal. Looks cheaper than it is — the customer keeps paying interest on money already repaid.
     *
     * @return list<array{0: int, 1: int}>
     */
    private function flat(int $principal, float $annualRatePercent, int $periods, EmiFrequency $frequency): array
    {
        $interest = (int) round($principal * ($annualRatePercent / 100) * ($periods / $frequency->perYear()));
        $installments = $this->spread($principal + $interest, $periods);
        $interests = $this->spread($interest, $periods);

        return array_map(fn (int $i) => [$installments[$i] - $interests[$i], $interests[$i]], range(0, $periods - 1));
    }

    /**
     * Reducing balance: PMT = P·r / (1 − (1 + r)^−n). Each period's interest is charged on what is still owed;
     * the last installment clears the balance exactly (it can differ from the others by a few cents).
     *
     * @return list<array{0: int, 1: int}>
     */
    private function reducing(int $principal, float $annualRatePercent, int $periods, EmiFrequency $frequency): array
    {
        $rate = ($annualRatePercent / 100) / $frequency->perYear();
        $payment = (int) round($principal * $rate / (1 - (1 + $rate) ** -$periods));
        $balance = $principal;
        $parts = [];

        for ($k = 1; $k <= $periods; $k++) {
            $interest = (int) round($balance * $rate);
            $principalPart = $k === $periods ? $balance : min($balance, $payment - $interest);
            $parts[] = [$principalPart, $interest];
            $balance -= $principalPart;
        }

        return $parts;
    }

    private function toMinor(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function fromMinor(int $minor): float
    {
        return round($minor / 100, 2);
    }
}
