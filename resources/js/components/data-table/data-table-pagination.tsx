import { type DataTablePaginationMeta } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
    pagination: DataTablePaginationMeta;
    perPage: number | 'all';
    perPageOptions: number[];
    allowAll: boolean;
    onPerPageChange: (value: number | 'all') => void;
    onPageChange: (page: number) => void;
    itemLabel?: string;
}

function pageWindow(current: number, last: number): (number | 'ellipsis')[] {
    const siblings = 1;
    const maxWithoutCollapsing = siblings * 2 + 5;

    if (last <= maxWithoutCollapsing) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, current - siblings);
    const end = Math.min(last - 1, current + siblings);

    if (start > 2) pages.push('ellipsis');
    for (let page = start; page <= end; page++) pages.push(page);
    if (end < last - 1) pages.push('ellipsis');

    pages.push(last);
    return pages;
}

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
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                <span className="tabular-nums">
                    {pagination.total === 0 ? `No ${itemLabel}` : `Showing ${pagination.from}–${pagination.to} of ${pagination.total} ${itemLabel}`}
                </span>
                {(perPageOptions.length > 1 || allowAll) && (
                    <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(value === 'all' ? 'all' : Number(value))}>
                        <SelectTrigger size="sm" className="w-[110px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option} / page
                                </SelectItem>
                            ))}
                            {allowAll && <SelectItem value="all">Show all</SelectItem>}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {perPage !== 'all' && pagination.last_page > 1 && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={pagination.current_page === 1}
                        onClick={() => onPageChange(pagination.current_page - 1)}
                    >
                        <ChevronLeft />
                        <span className="sr-only">Previous page</span>
                    </Button>

                    {/* Phones get a compact "Page x of y" instead of the numbered window. */}
                    <span className="text-muted-foreground px-2 text-sm tabular-nums sm:hidden">
                        {pagination.current_page} / {pagination.last_page}
                    </span>

                    {pages.map((page, index) =>
                        page === 'ellipsis' ? (
                            <span
                                key={`ellipsis-${index}`}
                                className="text-muted-foreground hidden size-8 items-center justify-center text-sm sm:flex"
                                aria-hidden="true"
                            >
                                …
                            </span>
                        ) : (
                            <Button
                                key={page}
                                variant={page === pagination.current_page ? 'primary' : 'ghost'}
                                size="icon-sm"
                                className={cn('hidden tabular-nums sm:inline-flex', page !== pagination.current_page && 'text-muted-foreground')}
                                onClick={() => onPageChange(page)}
                                aria-current={page === pagination.current_page ? 'page' : undefined}
                            >
                                {page}
                            </Button>
                        ),
                    )}

                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={pagination.current_page === pagination.last_page}
                        onClick={() => onPageChange(pagination.current_page + 1)}
                    >
                        <ChevronRight />
                        <span className="sr-only">Next page</span>
                    </Button>
                </nav>
            )}
        </div>
    );
}
