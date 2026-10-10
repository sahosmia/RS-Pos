import { Skeleton } from '@/components/ui/skeleton';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { cn } from '@/lib/utils';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { type Key, type KeyboardEvent, type ReactNode } from 'react';

export type DataTableDensity = 'compact' | 'default' | 'comfortable';

/** Vertical cell padding and text size per density. Horizontal padding is shared so columns line up across densities. */
const DENSITY_CLASSES: Record<DataTableDensity, { header: string; cell: string }> = {
    compact: { header: 'py-2', cell: 'py-1.5 text-[0.8125rem]' },
    default: { header: 'py-3', cell: 'py-3' },
    comfortable: { header: 'py-3', cell: 'py-3.5' },
};

const ALIGN_CLASSES = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/** Varied placeholder widths so the skeleton reads as a table of real content rather than a uniform block. */
const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5'] as const;

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
    /** Row spacing. `compact` suits dense ERP lists, `comfortable` gives breathing room. */
    density?: DataTableDensity;
    /** Keeps the header visible while the body scrolls. Default true. */
    stickyHeader?: boolean;
    /** Highlights selected rows. Selection state itself stays with the page (`useTableSelection`). */
    isRowSelected?: (row: TData) => boolean;
    /** Makes rows clickable (and keyboard-activatable). Interactive cells should stop propagation. */
    onRowClick?: (row: TData) => void;
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
    maxHeight = 'max(32rem, calc(100vh - 15rem))',
    emptyState,
    filteredEmptyState,
    canReset = false,
    density = 'default',
    stickyHeader = true,
    isRowSelected,
    onRowClick,
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
    const densityClasses = DENSITY_CLASSES[density];

    const hasNoData = data.length === 0;

    // Show empty states only when the request has finished.
    if (!loading && hasNoData && emptyState) {
        return <>{canReset && filteredEmptyState ? filteredEmptyState : emptyState}</>;
    }

    const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onRowClick?.(row);
        }
    };

    return (
        <div className="rounded-brand-card bg-card overflow-hidden shadow-[var(--brand-card-shadow-elevated)]" aria-busy={loading}>
            {viewMode === 'grid' ? (
                <div className="scrollbar-thin overflow-auto p-3" style={{ maxHeight }} aria-label="Data grid">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {loading
                            ? Array.from({ length: skeletonCardCount }).map((_, index) => (
                                  <div
                                      key={`skeleton-card-${index}`}
                                      className="rounded-brand-control border-brand-table-divider space-y-3 border p-4"
                                      aria-hidden="true"
                                  >
                                      <Skeleton className="h-5 w-2/3" />
                                      <Skeleton className="h-4 w-1/3" />
                                      <Skeleton className="h-10 w-full" />
                                  </div>
                              ))
                            : data.map((row) => (
                                  <div key={getRowKey(row)} className="animate-in fade-in duration-normal">
                                      {renderGridCard(row)}
                                  </div>
                              ))}
                    </div>
                </div>
            ) : (
                <div className="scrollbar-thin overflow-auto print:max-h-none print:overflow-visible" style={{ maxHeight }}>
                    {/*
                     * `min-w-max`: never narrower than the columns' natural width. With many columns the table
                     * grows past the card and scrolls sideways (the wrapper above is `overflow-auto`) instead of
                     * squeezing every column until its text breaks into narrow stacks. When the columns fit, it
                     * still fills the card (`w-full`). Print is left to wrap normally.
                     */}
                    <table className="w-full min-w-max border-separate border-spacing-0 text-sm print:min-w-0">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const meta = header.column.columnDef.meta;

                                        return (
                                            <th
                                                key={header.id}
                                                scope="col"
                                                className={cn(
                                                    'border-brand-table-divider bg-brand-table-header text-muted-foreground border-b px-3.5 text-xs font-semibold tracking-wide whitespace-nowrap',
                                                    densityClasses.header,
                                                    ALIGN_CLASSES[meta?.align ?? 'left'],
                                                    stickyHeader && 'sticky top-0 z-10',
                                                    meta?.printHidden && 'print:hidden',
                                                    meta?.headerClassName,
                                                )}
                                            >
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>

                        <tbody className="[&>tr:last-child>td]:border-b-0">
                            {loading
                                ? Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                                      <tr key={`skeleton-row-${rowIndex}`} aria-hidden="true">
                                          {table.getVisibleLeafColumns().map((column, columnIndex) => (
                                              <td
                                                  key={column.id}
                                                  className={cn(
                                                      'border-brand-table-divider border-b px-3.5',
                                                      densityClasses.cell,
                                                      ALIGN_CLASSES[column.columnDef.meta?.align ?? 'left'],
                                                  )}
                                              >
                                                  <Skeleton
                                                      className={cn(
                                                          'h-3.5 max-w-40',
                                                          SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length],
                                                          column.columnDef.meta?.align === 'right' && 'ml-auto',
                                                      )}
                                                  />
                                              </td>
                                          ))}
                                      </tr>
                                  ))
                                : table.getRowModel().rows.map((row) => {
                                      const selected = isRowSelected?.(row.original) ?? false;

                                      return (
                                          <tr
                                              key={row.id}
                                              data-state={selected ? 'selected' : undefined}
                                              onClick={
                                                  onRowClick
                                                      ? (event) => {
                                                            // React bubbles portal events (row-action menus) to the row; only real in-row clicks count.
                                                            if (event.currentTarget.contains(event.target as Node)) {
                                                                onRowClick(row.original);
                                                            }
                                                        }
                                                      : undefined
                                              }
                                              onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row.original) : undefined}
                                              tabIndex={onRowClick ? 0 : undefined}
                                              className={cn(
                                                  'hover:bg-brand-table-row-hover data-[state=selected]:bg-brand-table-row-selected motion-colors',
                                                  onRowClick &&
                                                      'focus-visible:ring-brand-focus-ring cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-inset',
                                              )}
                                          >
                                              {row.getVisibleCells().map((cell) => (
                                                  <td
                                                      key={cell.id}
                                                      className={cn(
                                                          'border-brand-table-divider border-b px-3.5 align-middle',
                                                          densityClasses.cell,
                                                          ALIGN_CLASSES[cell.column.columnDef.meta?.align ?? 'left'],
                                                          cell.column.columnDef.meta?.printHidden && 'print:hidden',
                                                          cell.column.columnDef.meta?.cellClassName,
                                                      )}
                                                  >
                                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                  </td>
                                              ))}
                                          </tr>
                                      );
                                  })}
                        </tbody>
                    </table>
                </div>
            )}

            {footer && <div className="border-brand-table-divider border-t px-3.5 py-2.5 print:hidden">{footer}</div>}
        </div>
    );
}
