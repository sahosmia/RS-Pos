import { useEffect, useRef, useState } from 'react';

export type EmiInterestMethodValue = 'none' | 'flat' | 'reducing';
export type EmiFrequencyValue = 'weekly' | 'monthly' | 'quarterly';
export type EmiTenureUnitValue = 'days' | 'weeks' | 'months' | 'years';

export interface EmiScheduleRow {
    number: number;
    due_date: string;
    opening_balance: number;
    principal: number;
    interest: number;
    amount: number;
    closing_balance: number;
}

/** What the server's EMI calculator returns — a quote for the form, never the saved figures. */
export interface EmiPreview {
    periods: number;
    sale_total: number;
    /** Installation charge inside sale_total: never financed, no interest; stays a separate due. */
    installation: number;
    /** The goods on the products chosen for EMI; the rest of the invoice is paid now. */
    financed_goods: number;
    /** Goods on the invoice that are not on EMI. */
    cash_goods: number;
    /** Down payment on the goods. */
    down_payment: number;
    /** The amount being financed: price minus down payment. */
    principal: number;
    interest_total: number;
    /** What is paid in instalments: principal + interest. */
    total_payable: number;
    /** Price plus interest — what the goods cost the customer in total (down payment included). */
    grand_total: number;
    installment_amount: number;
    first_due_date: string;
    tenure_adjusted: boolean;
    schedule: EmiScheduleRow[];
}

export interface EmiPreviewParams {
    saleTotal: number;
    /** Installation charge included in saleTotal. */
    installation: number;
    /** The goods on the products chosen for EMI (defaults to all the goods). */
    financedGoods: number;
    /** Down payment: what is paid now, taken off the price of the goods. */
    downPayment: number;
    method: EmiInterestMethodValue;
    annualRate: number;
    tenureValue: number | null;
    tenureUnit: EmiTenureUnitValue;
    frequency: EmiFrequencyValue;
    saleDate: string;
}

interface State {
    preview: EmiPreview | null;
    loading: boolean;
    /** First validation message from the server (e.g. "The down payment must be less than the total price."). */
    error: string | null;
}

const IDLE: State = { preview: null, loading: false, error: null };

/**
 * Debounced, abortable call to the server's EMI calculator, so the Add Sale form can show what an installment
 * plan would cost while the cashier is still typing the terms. Pass `null` to switch it off. A slow answer to an
 * older request can never overwrite a newer one.
 */
export function useEmiPreview(params: EmiPreviewParams | null, debounceMs = 300): State {
    const [state, setState] = useState<State>(IDLE);
    const abortRef = useRef<AbortController | null>(null);

    const ready = params !== null && params.saleTotal > 0 && !!params.tenureValue && params.tenureValue > 0;
    const key = ready
        ? JSON.stringify([
              params.saleTotal,
              params.installation,
              params.financedGoods,
              params.downPayment,
              params.method,
              params.annualRate,
              params.tenureValue,
              params.tenureUnit,
              params.frequency,
              params.saleDate,
          ])
        : null;

    useEffect(() => {
        abortRef.current?.abort();

        if (key === null || params === null) {
            setState(IDLE);

            return;
        }

        setState((current) => ({ ...current, loading: true }));
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = window.setTimeout(() => {
            const query = new URLSearchParams({
                sale_total: String(params.saleTotal),
                installation: String(params.installation),
                financed_goods: String(params.financedGoods),
                down_payment: String(params.downPayment),
                method: params.method,
                annual_rate: String(params.method === 'none' ? 0 : params.annualRate),
                tenure_value: String(params.tenureValue),
                tenure_unit: params.tenureUnit,
                frequency: params.frequency,
                sale_date: params.saleDate,
            });

            fetch(`${route('emi.calculate')}?${query.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            })
                .then(async (response) => {
                    const body = await response.json();

                    if (!response.ok) {
                        const first = Object.values((body.errors ?? {}) as Record<string, string[]>)[0]?.[0];

                        throw new Error(first ?? 'Could not calculate the installments.');
                    }

                    setState({ preview: body as EmiPreview, loading: false, error: null });
                })
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        return;
                    }

                    setState({
                        preview: null,
                        loading: false,
                        error: error instanceof Error ? error.message : 'Could not calculate the installments.',
                    });
                });
        }, debounceMs);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
        // `key` already captures every input that matters; `params` itself is a new object each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, debounceMs]);

    return state;
}
