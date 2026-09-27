import { type DataTableExportParams } from '@/components/data-table/data-table-export-dialog';
import { useCallback } from 'react';
import { type TableFilterBase } from './use-table-filters';

interface UseTableExportOptions<TFilters extends TableFilterBase> {
    /** Ziggy route name of the export endpoint, e.g. `'products.export'`. */
    routeName: string;
    /** The current filter/sort state — forwarded to the export endpoint for the 'all' scope. */
    filters: TFilters;
    /** Dropdown-filter fields (besides search/sort/direction, which are always forwarded) to send along. */
    filterKeys?: (keyof TFilters)[];
    selectedIds: number[];
}

/**
 * Builds the export URL and navigates to it — every list page's export endpoint
 * takes the same `format`/`scope`/`columns[]` shape, so this never needs to know
 * what the domain-specific filters mean. No "this page" scope (doc/corrections2.md
 * #7): `scope` is `'selected'` when rows are checked, else `'all'`.
 */
export function useTableExport<TFilters extends TableFilterBase>({
    routeName,
    filters,
    filterKeys = [],
    selectedIds,
}: UseTableExportOptions<TFilters>) {
    return useCallback(
        ({ format, scope, columns }: DataTableExportParams) => {
            const params = new URLSearchParams();
            params.set('format', format);
            params.set('scope', scope);
            columns.forEach((column) => params.append('columns[]', column));

            if (scope === 'selected') {
                selectedIds.forEach((id) => params.append('ids[]', String(id)));
            } else {
                if (filters.search) params.set('search', filters.search);
                if (filters.sort) params.set('sort', filters.sort);
                if (filters.direction) params.set('direction', filters.direction);

                filterKeys.forEach((key) => {
                    const value = filters[key];
                    if (value !== null && value !== undefined && value !== '') {
                        params.set(String(key), String(value));
                    }
                });
            }

            window.location.href = `${route(routeName)}?${params.toString()}`;
        },
        [routeName, filters, filterKeys, selectedIds],
    );
}
