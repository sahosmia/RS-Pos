import { Skeleton } from '@/components/ui/skeleton';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { cn } from '@/lib/utils';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { type Key, type ReactNode } from 'react';

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    /** Also wired into TanStack's `getRowId`, so `row.id` matches the real application id instead of the row's array index. */
    getRowKey: (row: TData) => Key;
    /** Per-item card — used for the grid view, on any device. */
    renderGridCard: (row: TData) => ReactNode;
    /** Table vs Grid — owned by the page (see `useTableViewMode`/`ViewModeToggle` in its filter bar). */
    viewMode: TableViewMode;
    /** Which Table-view columns show — owned by the page (see `DataTableViewOptions`); irrelevant in Grid view. */
    columnVisibility?: VisibilityState;
    /** Rendered as the table's own footer bar (typically `DataTablePagination`). */
    footer?: ReactNode;
    /** True while a search/filter/sort/page request is in flight — swaps rows for skeleton placeholders. */
    loading?: boolean;
    /** Body scrolls past this height with a sticky header; short lists just shrink to fit. */
    maxHeight?: string;
    /**
     * Shown in place of the table when `data` is empty — opt-in, so a table
     * with no empty-state handling still just renders an empty header.
     */
    emptyState?: ReactNode;
    /**
     * Shown instead of `emptyState` when the empty result is due to an active
     * filter/search (see `canReset`) — e.g. "No products match your filters"
     * with a "Clear filters" action, vs. "No products yet" with an "Add"
     * action. Falls back to `emptyState` if omitted.
     */
    filteredEmptyState?: ReactNode;
    /** Whether a filter/search is currently narrowing the result set — picks between `emptyState` and `filteredEmptyState`. */
    canReset?: boolean;
}

/**
 * Server-driven list table (sorting/filtering/pagination all live in the
 * page via Inertia query params) — this just renders the current page of
 * rows, in whichever view the page's `ViewModeToggle` currently has selected.
 * Table view scrolls horizontally on narrow screens rather than forcing a
 * device-based switch. "Grid view" (`renderGridCard`) is available on any
 * device, not only mobile — it's a layout choice, not a breakpoint.
 */
export default function DataTable<TData>({
    columns,
    data,
    getRowKey,
    renderGridCard,
    viewMode,
    columnVisibility,
    footer,
    loading = false,
    maxHeight = 'min(42rem, 70vh)',
    emptyState,
    filteredEmptyState,
    canReset = false,
}: DataTableProps<TData>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row) => String(getRowKey(row)),
        state: columnVisibility ? { columnVisibility } : undefined,
    });

    const skeletonRowCount = Math.min(Math.max(data.length, 6), 14);
    const skeletonCardCount = Math.min(Math.max(data.length, 3), 9);

    if (data.length === 0 && emptyState) {
        return <>{canReset && filteredEmptyState ? filteredEmptyState : emptyState}</>;
    }

    return (
        <div className="bg-card overflow-hidden rounded-lg border">
            {viewMode === 'grid' ? (
                <div className="scrollbar-thin overflow-auto p-3" style={{ maxHeight }}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {loading
                            ? Array.from({ length: skeletonCardCount }).map((_, index) => (
                                  <div key={`skeleton-card-${index}`} className="animate-in fade-in space-y-2 rounded-lg border p-3 duration-200">
                                      <Skeleton className="h-4 w-2/3" />
                                      <Skeleton className="h-3 w-1/3" />
                                  </div>
                              ))
                            : data.map((row) => (
                                  <div key={getRowKey(row)} className="animate-in fade-in duration-300">
                                      {renderGridCard(row)}
                                  </div>
                              ))}
                    </div>
                </div>
            ) : (
                <div className="scrollbar-thin overflow-auto print:max-h-none print:overflow-visible" style={{ maxHeight }}>
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                'bg-muted sticky top-0 z-10 border-b px-4 py-2.5 text-left font-medium whitespace-nowrap',
                                                header.column.columnDef.meta?.printHidden && 'print:hidden',
                                                header.column.columnDef.meta?.headerClassName,
                                            )}
                                        >
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y">
                            {loading
                                ? Array.from({ length: skeletonRowCount }).map((_, index) => (
                                      <tr key={`skeleton-row-${index}`} className="animate-in fade-in duration-200">
                                          {table.getVisibleLeafColumns().map((column) => (
                                              <td key={column.id} className="px-4 py-2.5">
                                                  <Skeleton className="h-4 w-full max-w-40" />
                                              </td>
                                          ))}
                                      </tr>
                                  ))
                                : table.getRowModel().rows.map((row) => (
                                      <tr key={row.id} className="animate-in fade-in hover:bg-muted/40 transition-colors duration-300">
                                          {row.getVisibleCells().map((cell) => (
                                              <td
                                                  key={cell.id}
                                                  className={cn(
                                                      'px-4 py-2',
                                                      cell.column.columnDef.meta?.printHidden && 'print:hidden',
                                                      cell.column.columnDef.meta?.cellClassName,
                                                  )}
                                              >
                                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
                        </tbody>
                    </table>
                </div>
            )}

            {footer && <div className="bg-muted/30 border-t px-4 py-3 print:hidden">{footer}</div>}
        </div>
    );
}
