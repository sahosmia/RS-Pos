<?php

namespace App\Http\Controllers\Sales;

use App\Enums\EmiFrequency;
use App\Enums\EmiInterestMethod;
use App\Enums\EmiTenureUnit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\Emi\CalculateEmiRequest;
use App\Services\EmiCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/**
 * The Add Sale form's EMI preview: given a price, a down payment and the terms, returns what the customer will
 * actually pay and the installment-by-installment schedule. Read-only — it saves nothing, and the sale itself
 * recalculates everything on the server when it is confirmed, so this is a quote, never the source of truth.
 */
class EmiCalculationController extends Controller
{
    public function __invoke(CalculateEmiRequest $request, EmiCalculator $calculator): JsonResponse
    {
        $data = $request->validated();

        $frequency = EmiFrequency::tryFrom($data['frequency'] ?? '') ?? EmiFrequency::Monthly;
        $unit = EmiTenureUnit::from($data['tenure_unit']);
        $method = EmiInterestMethod::tryFrom($data['method'] ?? '') ?? EmiInterestMethod::None;

        $saleTotal = round((float) $data['sale_total'], 2);
        $installation = round((float) ($data['installation'] ?? 0), 2);
        $goods = round($saleTotal - $installation, 2);
        // The products chosen for EMI; everything else on the invoice is paid now and never financed.
        $financedGoods = isset($data['financed_goods']) ? min(round((float) $data['financed_goods'], 2), $goods) : $goods;
        $downPayment = round((float) ($data['down_payment'] ?? 0), 2);
        $periods = $calculator->periodsFor((int) $data['tenure_value'], $unit, $frequency);
        $saleDate = CarbonImmutable::parse($data['sale_date'] ?? now()->toDateString());

        $result = $calculator->calculate(
            // Only the EMI products are financed: the other products and the installation carry no interest.
            round($financedGoods - $downPayment, 2),
            $method,
            $method === EmiInterestMethod::None ? 0.0 : (float) ($data['annual_rate'] ?? 0),
            $periods,
            $frequency,
            $frequency->dueDate($saleDate, 1),
        );

        return response()->json([
            ...$result,
            'sale_total' => $saleTotal,
            'installation' => $installation,
            'financed_goods' => $financedGoods,
            // Products on the same invoice that are not on EMI: paid now, never financed.
            'cash_goods' => round($goods - $financedGoods, 2),
            'down_payment' => $downPayment,
            // The price with interest added: what the customer pays in total for the goods.
            'grand_total' => round($saleTotal + $result['interest_total'], 2),
            'first_due_date' => $result['schedule'][0]['due_date'],
            // True when the duration doesn't divide evenly into the chosen frequency and was rounded up.
            'tenure_adjusted' => abs($unit->toYears((int) $data['tenure_value']) * $frequency->perYear() - $periods) > 0.01,
        ]);
    }
}
