import { router } from '@inertiajs/react';
import { type RefObject, useEffect, useRef } from 'react';

interface Options {
    searchRef: RefObject<HTMLInputElement | null>;
    paymentRef: RefObject<HTMLDivElement | null>;
    /** Runs on Enter while no text field has focus. */
    onConfirm: () => void;
}

/** F2 → product search, F4 → payment, Esc → back to the sales list, Enter → confirm the sale. */
export function useSaleShortcuts({ searchRef, paymentRef, onConfirm }: Options) {
    // Always call the latest handler without re-binding the window listener on every render.
    const confirmRef = useRef(onConfirm);
    confirmRef.current = onConfirm;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'F4') {
                e.preventDefault();
                paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (e.key === 'Escape') {
                // an open dialog/sheet already used this Esc to close itself
                if (e.defaultPrevented) return;
                router.get(route('sales.index'));
            } else if (e.key === 'Enter') {
                const tag = (document.activeElement?.tagName ?? '').toLowerCase();
                if (tag !== 'input' && tag !== 'textarea') {
                    e.preventDefault();
                    confirmRef.current();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [searchRef, paymentRef]);
}
