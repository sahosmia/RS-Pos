
import { Skeleton } from '@/components/ui/skeleton';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { cn } from '@/lib/utils';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type VisibilityState,
} from '@tanstack/react-table';
import { type Key, type ReactNode } from 'react';

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    /** Stable application identifier used as the TanStack row ID. */
    getRowKey: (row: TData) => Key;
    /** Card renderer used in Grid view on all screen sizes. */
    renderGridCard: (row: TData) => ReactNode;
    /** Table or Grid view, controlled by the parent page. */
    viewMode: TableViewMode;
    /** Column visibility controlled by the parent page. */
    columnVisibility?: VisibilityState;
    /** Optional footer, typically containing pagination. */
    footer?: ReactNode;
    /** Whether the current server request is in progress. */
    loading?: boolean;
    /** Maximum scrollable height of the table or grid. */
    maxHeight?: string;
    /** Empty state shown when there are no records. */
    emptyState?: ReactNode;
    /** Alternative empty state when filters are active. */
    filteredEmptyState?: ReactNode;
    /** Whether search or filters are active. */
    canReset?: boolean;
}

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
        ...(columnVisibility !== undefined && {
            state: { columnVisibility },
        }),
    });

    const skeletonRowCount = Math.min(Math.max(data.length, 6), 14);
    const skeletonCardCount = Math.min(Math.max(data.length, 3), 9);

    const hasNoData = data.length === 0;

    // Show empty states only when the request has finished.
    if (!loading && hasNoData && emptyState) {
        return (
            <>
                {canReset && filteredEmptyState
                    ? filteredEmptyState
                    : emptyState}
            </>
        );
    }

    return (
        <div
            className="overflow-hidden rounded-xl border bg-card"
            aria-busy={loading}
        >
            {viewMode === 'grid' ? (
                <div
                    className="scrollbar-thin overflow-auto p-3"
                    style={{ maxHeight }}
                    aria-label="Data grid"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {loading ? (
                            Array.from({ length: skeletonCardCount }).map(
                                (_, index) => (
                                    <div
                                        key={`skeleton-card-${index}`}
                                        className="space-y-3 rounded-xl border p-4"
                                        aria-hidden="true"
                                    >
                                        <Skeleton className="h-5 w-2/3" />
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ),
                            )
                        ) : (
                            data.map((row) => (
                                <div
                                    key={getRowKey(row)}
                                    className="animate-in fade-in duration-300"
                                >
                                    {renderGridCard(row)}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div
                    className="scrollbar-thin overflow-auto print:max-h-none print:overflow-visible"
                    style={{ maxHeight }}
                >
                    {/*
                      * `min-w-max`: never narrower than the columns' natural width. With many columns the table
                      * grows past the card and scrolls sideways (the wrapper above is `overflow-auto`) instead of
                      * squeezing every column until its text breaks into narrow stacks. When the columns fit, it
                      * still fills the card (`w-full`). Print is left to wrap normally.
                      */}
                    <table className="w-full min-w-max text-sm print:min-w-0">
                        <thead className="text-muted-foreground">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            className={cn(
                                                'sticky top-0 z-10 whitespace-nowrap border-b bg-muted px-4 py-3 text-left font-medium',
                                                header.column.columnDef.meta?.printHidden &&
                                                    'print:hidden',
                                                header.column.columnDef.meta?.headerClassName,
                                            )}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>

                        <tbody className="divide-y">
                            {loading ? (
                                Array.from({
                                    length: skeletonRowCount,
                                }).map((_, index) => (
                                    <tr
                                        key={`skeleton-row-${index}`}
                                        aria-hidden="true"
                                    >
                                        {table
                                            .getVisibleLeafColumns()
                                            .map((column) => (
                                                <td
                                                    key={column.id}
                                                    className="px-4 py-3"
                                                >
                                                    <Skeleton className="h-4 w-full max-w-40" />
                                                </td>
                                            ))}
                                    </tr>
                                ))
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="transition-colors hover:bg-muted/40"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={cn(
                                                    'px-4 py-3',
                                                    cell.column.columnDef.meta
                                                        ?.printHidden &&
                                                        'print:hidden',
                                                    cell.column.columnDef.meta
                                                        ?.cellClassName,
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {footer && (
                <div className="border-t bg-muted/30 px-4 py-3 print:hidden">
                    {footer}
                </div>
            )}
        </div>
    );
}
