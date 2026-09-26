import { type DataTablePaginationMeta } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
    pagination: DataTablePaginationMeta;
    perPage: number | 'all';
    perPageOptions: number[];
    /**
     * Whether "Show all" appears in the per-page dropdown at all. This is a
     * pure prop — the component has no opinion on dataset size. Always pass
     * this from a backend-controlled setting (e.g. this app's
     * `Settings::pagination_allow_all`, shared via Inertia), never hardcode
     * `true` at a call site: an ERP list (Products, Customers, Invoices,
     * Stock Movements, ...) can grow past what "fetch everything, no limit"
     * can safely serialize into one response.
     */
    allowAll: boolean;
    onPerPageChange: (value: number | 'all') => void;
    onPageChange: (page: number) => void;
    /** Plural noun for the "Showing X–Y of Z ..." line, e.g. "products". */
    itemLabel?: string;
}

/**
 * 1 2 3 ... 45 46 — always shows first/last plus a window around the current
 * page, collapsing the gap to a single "..." instead of listing every page.
 */
function pageWindow(current: number, last: number): (number | 'ellipsis')[] {
    const siblings = 1;
    const maxWithoutCollapsing = siblings * 2 + 5;

    if (last <= maxWithoutCollapsing) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, current - siblings);
    const end = Math.min(last - 1, current + siblings);

    if (start > 2) {
        pages.push('ellipsis');
    }

    for (let page = start; page <= end; page++) {
        pages.push(page);
    }

    if (end < last - 1) {
        pages.push('ellipsis');
    }

    pages.push(last);

    return pages;
}

/**
 * Rows-per-page dropdown + numbered pager shared by every list page's
 * Datatable. Purely presentational — the page owns the actual `per_page`/
 * `page` query params and re-requests via Inertia on either callback.
 */
export default function DataTablePagination({
    pagination,
    perPage,
    perPageOptions,
    allowAll,
    onPerPageChange,
    onPageChange,
    itemLabel = 'items',
}: DataTablePaginationProps) {
    const pages = pageWindow(pagination.current_page, pagination.last_page);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                <span>
                    {pagination.total === 0 ? `No ${itemLabel}` : `Showing ${pagination.from}–${pagination.to} of ${pagination.total} ${itemLabel}`}
                </span>
                {(perPageOptions.length > 1 || allowAll) && (
                    <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(value === 'all' ? 'all' : Number(value))}>
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                            {allowAll && <SelectItem value="all">Show all</SelectItem>}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {perPage !== 'all' && pagination.last_page > 1 && (
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={pagination.current_page === 1}
                        onClick={() => onPageChange(pagination.current_page - 1)}
                    >
                        <ChevronLeft className="size-4" />
                        <span className="sr-only">Previous page</span>
                    </Button>

                    {pages.map((page, index) =>
                        page === 'ellipsis' ? (
                            <span key={`ellipsis-${index}`} className="text-muted-foreground px-2 text-sm">
                                …
                            </span>
                        ) : (
                            <Button
                                key={page}
                                variant={page === pagination.current_page ? 'default' : 'outline'}
                                size="icon"
                                className="size-8"
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </Button>
                        ),
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={pagination.current_page === pagination.last_page}
                        onClick={() => onPageChange(pagination.current_page + 1)}
                    >
                        <ChevronRight className="size-4" />
                        <span className="sr-only">Next page</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
