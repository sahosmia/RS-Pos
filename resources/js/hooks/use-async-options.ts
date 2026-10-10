import { type ComboboxOption } from '@/components/ui/combobox';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAsyncOptionsConfig<TRaw, TValue extends string | number> {
    /** A Ziggy `route()` result for an existing JSON search endpoint. It is called with `?q=…` (+ `params`). */
    url: string;
    /** Turns one item of the response into a combobox option (labels, descriptions are the caller's business). */
    toOption: (item: TRaw) => ComboboxOption<TValue>;
    /** Extra static query params, e.g. `{ type: 'supplier' }`. */
    params?: Record<string, string>;
    /** Wait this long after the last keystroke. Default 300ms. */
    debounceMs?: number;
    /** Don't search until at least this many characters are typed (0 loads a default list on open). Default 0. */
    minChars?: number;
}

/**
 * Debounced, abortable server search for `Combobox`, in the shape the app's search endpoints already use
 * (`GET url?q=…` → `{ data: TRaw[] }`, same as `SearchableSelect`). Stale requests are cancelled, so
 * results from an older query can never overwrite newer ones.
 *
 *   const customers = useAsyncOptions({ url: route('contacts.search'), toOption: c => ({ value: c.id, label: c.name }) });
 *   <Combobox {...customers.comboboxProps} value={id} onValueChange={...} />
 */
export function useAsyncOptions<TRaw, TValue extends string | number>({ url, toOption, params, debounceMs = 300, minChars = 0 }: UseAsyncOptionsConfig<TRaw, TValue>) {
    const [options, setOptions] = useState<ComboboxOption<TValue>[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [enabled, setEnabled] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    // Latest mapper/params without making the effect refetch every render (callers usually pass inline objects).
    const latest = useRef({ toOption, params });
    latest.current = { toOption, params };

    useEffect(() => {
        abortRef.current?.abort();

        if (!enabled || query.trim().length < minChars) {
            setLoading(false);

            if (enabled) {
                setOptions([]);
            }

            return;
        }

        setLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = window.setTimeout(() => {
            const search = new URLSearchParams({ q: query.trim(), ...latest.current.params });

            fetch(`${url}${url.includes('?') ? '&' : '?'}${search.toString()}`, { headers: { Accept: 'application/json' }, signal: controller.signal })
                .then((response) => response.json())
                .then((json: { data: TRaw[] }) => setOptions(json.data.map(latest.current.toOption)))
                .catch((error: unknown) => {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        setOptions([]);
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }, query === '' ? 0 : debounceMs);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [enabled, query, url, debounceMs, minChars]);

    const onOpenChange = useCallback((open: boolean) => setEnabled(open), []);

    return {
        options,
        loading,
        /** Spread onto `<Combobox>`: wires options, loading, search and lazy loading on open. */
        comboboxProps: { options, loading, onSearchChange: setQuery, onOpenChange },
    };
}
