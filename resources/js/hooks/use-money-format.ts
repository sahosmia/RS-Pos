import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

/**
 * Formats an amount with the shop's configured currency symbol,
 * keeping the minus sign in front of the symbol (-৳500.00).
 *
 * Memoized on `shop.currency_symbol` — callers that put the returned function
 * in a `useMemo`/`useCallback` dependency array (e.g. a Datatable's column
 * defs) need a stable reference, otherwise it'd be "new" every render and
 * defeat that memoization entirely.
 */
export function useMoneyFormat() {
    const { shop } = usePage<SharedData>().props;

    return useCallback(
        (amount: number): string => {
            const formatted = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(Math.abs(amount));

            return `${amount < 0 ? '-' : ''}${shop.currency_symbol}${formatted}`;
        },
        [shop.currency_symbol],
    );
}
