import { type FormDataConvertible } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** The fields every list page's filter shape must carry so this hook can drive search/sort. */
export interface TableFilterBase {
    search?: string | null;
    sort?: string;
    direction?: 'asc' | 'desc';
}

interface UseTableFiltersOptions<TFilters extends TableFilterBase> {
    /** Ziggy route name the filtered list page is rendered from, e.g. `'products.index'`. */
    routeName: string;
    /** The current filter/sort/pagination state, as passed down from the controller. */
    filters: TFilters;
    /** Debounce delay (ms) before an in-progress `search` edit triggers a request. Defaults to 600ms. */
    searchDebounceMs?: number;
    /**
     * The dropdown-filter fields (never search/sort/direction/per_page) that
     * "Reset" clears back to null, e.g. `{ category_id: null, brand_id: null }`.
     * Also drives `activeFilterCount`/`canReset` — a field only counts as
     * "active" while it differs from its value here.
     */
    emptyFilters?: Partial<TFilters>;
}

/**
 * Server-side filter/sort/pagination for an Inertia list page — every list page in
 * this app (Products, Sales, Purchases, Contacts, ...) follows the same shape:
 * a debounced search box plus a handful of dropdown filters, all reissuing the
 * same `router.get` with the current filters merged with whatever changed.
 *
 * Domain-specific filter fields (category_id, stock_status, ...) are never named
 * here — callers just pass a `Partial<TFilters>` of what changed.
 */
export function useTableFilters<TFilters extends TableFilterBase>({
    routeName,
    filters,
    searchDebounceMs = 600,
    emptyFilters = {},
}: UseTableFiltersOptions<TFilters>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const pendingSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (next: Partial<TFilters> & { page?: number }, options?: { isSearch?: boolean }) => {
            router.get(route(routeName), { ...filters, ...next } as unknown as Record<string, FormDataConvertible>, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => {
                    setIsLoading(true);
                    if (options?.isSearch) setIsSearching(true);
                },
                onFinish: () => {
                    setIsLoading(false);
                    setIsSearching(false);
                },
            });
        },
        [routeName, filters],
    );

    // Auto-search as the user types — no separate Search button to click.
    useEffect(() => {
        const currentSearch = filters.search ?? '';
        if (search === currentSearch) {
            return;
        }

        const timeout = setTimeout(() => {
            pendingSearchTimeout.current = null;
            applyFilters({ search: search || null } as Partial<TFilters>, { isSearch: true });
        }, searchDebounceMs);
        pendingSearchTimeout.current = timeout;

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Pressing Enter (or any other immediate-submit trigger) should win over an
    // already-scheduled debounce — otherwise the debounced timeout still fires
    // afterward and issues a second, identical request.
    const submitSearchNow = useCallback(() => {
        if (pendingSearchTimeout.current !== null) {
            clearTimeout(pendingSearchTimeout.current);
            pendingSearchTimeout.current = null;
        }
        applyFilters({ search: search || null } as Partial<TFilters>, { isSearch: true });
    }, [applyFilters, search]);

    const handleSort = useCallback(
        (column: string) => {
            applyFilters({
                sort: column,
                direction: filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc',
            } as Partial<TFilters>);
        },
        [applyFilters, filters.sort, filters.direction],
    );

    const filterKeys = useMemo(() => Object.keys(emptyFilters) as (keyof TFilters)[], [emptyFilters]);

    const activeFilterCount = useMemo(
        () => filterKeys.filter((key) => filters[key] !== emptyFilters[key]).length,
        [filterKeys, filters, emptyFilters],
    );

    const canReset = activeFilterCount > 0 || search !== '';

    const resetFilters = useCallback(() => {
        setSearch('');
        applyFilters({ search: null, ...emptyFilters } as Partial<TFilters>);
    }, [applyFilters, emptyFilters]);

    return {
        search,
        setSearch,
        isLoading,
        isSearching,
        applyFilters,
        submitSearchNow,
        handleSort,
        activeFilterCount,
        canReset,
        resetFilters,
    };
}
