import { type DataTableExportParams } from '@/components/data-table/data-table-export-dialog';
import { useTableExport } from '@/hooks/table/use-table-export';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableSelection } from '@/hooks/table/use-table-selection';
import { type TableViewMode, useTableViewMode } from '@/hooks/use-table-view-mode';
import { type VisibilityState } from '@tanstack/react-table';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';

export interface ListPageExport<TFilters> {
    /** Ziggy route of the export endpoint, e.g. `'sales.export'`. */
    routeName: string;
    /** Filter fields forwarded to the export endpoint besides search / sort / direction. */
    filterKeys: (keyof TFilters)[];
    /**
     * Which export columns start ticked for each table column that is visible: `{ invoice: ['invoice_no'], date: ['sale_date'] }`.
     * Keeps "Export" defaulting to what's on screen.
     */
    columnMap: Record<string, string[]>;
}

interface Options<TFilters extends TableFilterBase, TRow> {
    /** Ziggy route of the list page itself, e.g. `'sales.index'`. */
    routeName: string;
    filters: TFilters;
    /** Filter fields that "Reset" clears back to null (and that count towards the active-filter badge). */
    emptyFilters?: Partial<TFilters>;
    /** The current page's rows. */
    rows: TRow[];
    getId: (row: TRow) => number;
    /** Omit on pages without an export endpoint. */
    export?: ListPageExport<TFilters>;
    /** Columns hidden until the user turns them on in the Columns menu, e.g. `{ status: false }`. */
    initialColumnVisibility?: VisibilityState;
}

export interface ListPageState<TFilters extends TableFilterBase> {
    search: string;
    setSearch: (value: string) => void;
    isLoading: boolean;
    isSearching: boolean;
    submitSearchNow: () => void;
    applyFilters: (next: Partial<TFilters> & { page?: number }) => void;
    handleSort: (column: string) => void;
    activeFilterCount: number;
    canReset: boolean;
    resetFilters: () => void;
    viewMode: TableViewMode;
    setViewMode: (mode: TableViewMode) => void;
    columnVisibility: VisibilityState;
    setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
    selection: ReturnType<typeof useTableSelection<unknown>>;
    handleExport: (params: DataTableExportParams) => void;
    defaultExportColumns: string[];
}

/**
 * The state every list page (Sales, Expenses, Assets, ...) needs and used to set up by hand: server-side
 * search / filters / sorting, row selection, the table-or-grid choice, column visibility, and the export defaults.
 * Pair it with `<ListTable>` for the toolbar, table and pagination.
 */
export function useListPage<TFilters extends TableFilterBase, TRow>({
    routeName,
    filters,
    emptyFilters,
    rows,
    getId,
    export: exportConfig,
    initialColumnVisibility,
}: Options<TFilters, TRow>): ListPageState<TFilters> {
    const [viewMode, setViewMode] = useTableViewMode();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {});

    const tableFilters = useTableFilters({ routeName, filters, emptyFilters });
    const selection = useTableSelection({ rows, getId });

    const handleExport = useTableExport({
        routeName: exportConfig?.routeName ?? '',
        filters,
        filterKeys: exportConfig?.filterKeys ?? [],
        selectedIds: selection.selectedIds,
    });

    const defaultExportColumns = useMemo(() => {
        const columnMap = exportConfig?.columnMap ?? {};

        return Object.entries(columnMap).flatMap(([tableColumn, exportColumns]) => (columnVisibility[tableColumn] !== false ? exportColumns : []));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnVisibility]);

    return {
        ...tableFilters,
        viewMode,
        setViewMode,
        columnVisibility,
        setColumnVisibility,
        selection: selection as ReturnType<typeof useTableSelection<unknown>>,
        handleExport,
        defaultExportColumns,
    };
}
