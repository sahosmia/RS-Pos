import { useCallback, useMemo, useState } from 'react';

interface UseTableSelectionOptions<T> {
    /** The current page's rows — used only to compute select-all/indeterminate state. */
    rows: T[];
    getId: (row: T) => number;
}

/**
 * Row selection for a paginated table (checkbox column + bulk actions like
 * Export/Delete-selected). Selection is page-scoped: switching pages or
 * filters doesn't carry ids over, matching how every list page here uses it.
 */
export function useTableSelection<T>({ rows, getId }: UseTableSelectionOptions<T>) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const isSelected = useCallback((id: number) => selectedIds.includes(id), [selectedIds]);

    const toggle = useCallback((id: number, checked: boolean) => {
        setSelectedIds((current) => (checked ? [...current, id] : current.filter((selectedId) => selectedId !== id)));
    }, []);

    const toggleAll = useCallback(
        (checked: boolean) => {
            setSelectedIds(checked ? rows.map(getId) : []);
        },
        [rows, getId],
    );

    const clear = useCallback(() => setSelectedIds([]), []);

    const isAllSelected = useMemo(() => rows.length > 0 && rows.every((row) => selectedIds.includes(getId(row))), [rows, getId, selectedIds]);
    const isSomeSelected = useMemo(() => rows.some((row) => selectedIds.includes(getId(row))), [rows, getId, selectedIds]);

    return useMemo(
        () => ({ selectedIds, isSelected, toggle, toggleAll, clear, isAllSelected, isSomeSelected }),
        [selectedIds, isSelected, toggle, toggleAll, clear, isAllSelected, isSomeSelected],
    );
}
