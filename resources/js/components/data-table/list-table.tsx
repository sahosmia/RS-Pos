import DataTable from '@/components/data-table/data-table';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { type DataTableColumnOption, type DataTablePaginationMeta } from '@/components/data-table/types';
import { NoResultsState } from '@/components/shared/empty-state';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { type Key, type ReactNode } from 'react';

interface ListTableProps<TRow, TFilters extends TableFilterBase & { per_page: number | 'all' }> {
    list: ListPageState<TFilters>;
    /** The paginator Laravel sent: its rows plus the page numbers. */
    data: DataTablePaginationMeta & { data: TRow[] };
    filters: TFilters;
    columns: ColumnDef<TRow>[];
    getRowKey: (row: TRow) => Key;
    renderGridCard: (row: TRow) => ReactNode;
    /** Shown after the count in the footer, e.g. "Showing 1–20 of 85 sales". */
    itemLabel: string;
    /** Enables the search box. */
    searchPlaceholder?: string;
    /** The filter controls inside the toolbar's collapsible panel. */
    filterSlot?: ReactNode;
    /** Bulk-action chip shown in the toolbar row while rows are ticked (renders nothing when none are). */
    selectionSlot?: ReactNode;
    /** Columns the "Columns" menu can show / hide. */
    visibilityColumns?: DataTableColumnOption[];
    /** Columns the export dialog offers; omit for pages without export. */
    exportColumns?: DataTableColumnOption[];
    /** Shown when the table has no rows at all. */
    emptyState: ReactNode;
    /** When filters match nothing — defaults to a "no matches" message with a Clear filters button. */
    filteredEmptyState?: ReactNode;
}

/**
 * Toolbar (search, filters, columns, export, table/grid switch) + table or grid + pagination, wired to a
 * `useListPage()` state. Everything a list page repeated now lives here; the page keeps only what's unique.
 */
export default function ListTable<TRow, TFilters extends TableFilterBase & { per_page: number | 'all' }>({
    list,
    data,
    filters,
    columns,
    getRowKey,
    renderGridCard,
    itemLabel,
    searchPlaceholder,
    filterSlot,
    selectionSlot,
    visibilityColumns,
    exportColumns,
    emptyState,
    filteredEmptyState,
}: ListTableProps<TRow, TFilters>) {
    const { shop } = usePage<SharedData>().props;

    return (
        <>
            <DataTableToolbar
                {...(searchPlaceholder !== undefined && {
                    search: list.search,
                    onSearchChange: list.setSearch,
                    onSearchSubmit: list.submitSearchNow,
                    isSearching: list.isSearching,
                    searchPlaceholder,
                })}
                activeFilterCount={list.activeFilterCount}
                canReset={list.canReset}
                onReset={list.resetFilters}
                viewMode={list.viewMode}
                onViewModeChange={list.setViewMode}
                {...(visibilityColumns && {
                    visibilityColumns,
                    columnVisibility: list.columnVisibility,
                    onVisibilityChange: (id: string, visible: boolean) => list.setColumnVisibility((current) => ({ ...current, [id]: visible })),
                })}
                {...(exportColumns && {
                    exportColumns,
                    defaultExportColumns: list.defaultExportColumns,
                    totalCount: data.total,
                    selectedCount: list.selection.selectedIds.length,
                    onExport: list.handleExport,
                })}
                filterSlot={filterSlot}
                selectionSlot={selectionSlot}
            />

            <DataTable
                columns={columns}
                data={data.data}
                getRowKey={getRowKey}
                renderGridCard={renderGridCard}
                viewMode={list.viewMode}
                columnVisibility={list.columnVisibility}
                loading={list.isLoading}
                canReset={list.canReset}
                emptyState={emptyState}
                filteredEmptyState={
                    filteredEmptyState ?? (
                        <NoResultsState
                            title="No results match your filters"
                            description="Try a different filter or date range."
                            onReset={list.resetFilters}
                            resetLabel="Clear filters"
                        />
                    )
                }
                footer={
                    <DataTablePagination
                        pagination={data}
                        perPage={filters.per_page}
                        perPageOptions={shop.pagination_options}
                        allowAll={shop.pagination_allow_all}
                        onPerPageChange={(value) => list.applyFilters({ per_page: value } as Partial<TFilters>)}
                        onPageChange={(page) => list.applyFilters({ page } as Partial<TFilters> & { page: number })}
                        itemLabel={itemLabel}
                    />
                }
            />
        </>
    );
}
