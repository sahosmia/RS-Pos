/** A toggleable column, used by both `DataTableViewOptions` (Table view) and `DataTableExportDialog` (export columns). */
export interface DataTableColumnOption {
    id: string;
    label: string;
}

/**
 * The subset of Laravel's paginator shape `DataTablePagination` actually
 * needs — intentionally narrower than `Paginated<T>` from `@/types/models`
 * (which also carries `data`/`prev_page_url`/`next_page_url`), so a page can
 * pass its paginator object straight through without reshaping it.
 */
export interface DataTablePaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
