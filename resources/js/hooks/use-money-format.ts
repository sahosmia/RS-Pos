import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/**
 * Formats an amount with the shop's configured currency symbol,
 * keeping the minus sign in front of the symbol (-৳500.00).
 */
export function useMoneyFormat() {
    const { shop } = usePage<SharedData>().props;

    return (amount: number): string => {
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(amount));

        return `${amount < 0 ? '-' : ''}${shop.currency_symbol}${formatted}`;
    };
}
