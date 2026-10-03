import DataTable from '@/components/data-table/data-table';
import DataTablePagination from '@/components/data-table/data-table-pagination';
import DataTableToolbar from '@/components/data-table/data-table-toolbar';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type TableFilterBase, useTableFilters } from '@/hooks/table/use-table-filters';
import { useTableViewMode } from '@/hooks/use-table-view-mode';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ActivityLogEntry, type Paginated } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Activity Log', href: '/activity-log' }];

interface ActivityLogFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    causer_id: number | null;
    subject_type: string | null;
    event: string | null;
    per_page: number | 'all';
}

interface ActivityLogProps {
    activities: Paginated<ActivityLogEntry>;
    users: { id: number; name: string }[];
    recordTypes: { value: string; label: string }[];
    filters: ActivityLogFilters;
}

const EVENTS = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'deleted', label: 'Deleted' },
];

const EVENT_TONE: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    updated: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

function EventBadge({ event }: { event: string }) {
    return (
        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize', EVENT_TONE[event] ?? 'bg-muted text-muted-foreground')}>
            {event}
        </span>
    );
}

function Changes({ entry }: { entry: ActivityLogEntry }) {
    if (entry.changes.length === 0) {
        return <span className="text-muted-foreground/60">—</span>;
    }

    return (
        <ul className="space-y-0.5 text-xs">
            {entry.changes.map((change) => (
                <li key={change.field} className="break-words">
                    <span className="font-medium">{change.field}</span>
                    <span className="text-muted-foreground">: </span>
                    {entry.event === 'updated' && change.old !== null && (
                        <>
                            <span className="text-muted-foreground line-through">{change.old}</span>
                            <span className="text-muted-foreground"> → </span>
                        </>
                    )}
                    <span>{change.new ?? '—'}</span>
                </li>
            ))}
            {entry.more_changes > 0 && <li className="text-muted-foreground">+{entry.more_changes} more</li>}
        </ul>
    );
}

export default function ActivityLogIndex({ activities, users, recordTypes, filters }: ActivityLogProps) {
    const { shop } = usePage<SharedData>().props;
    const [viewMode, setViewMode] = useTableViewMode();

    const { isLoading, applyFilters, activeFilterCount, canReset, resetFilters } = useTableFilters({
        routeName: 'activity-log.index',
        filters,
        emptyFilters: { from: null, to: null, causer_id: null, subject_type: null, event: null },
    });

    const columns = useMemo<ColumnDef<ActivityLogEntry>[]>(
        () => [
            {
                id: 'when',
                header: 'When',
                meta: { cellClassName: 'whitespace-nowrap align-top' },
                cell: ({ row }) => formatDateTime(row.original.created_at),
            },
            {
                id: 'user',
                header: 'User',
                meta: { cellClassName: 'align-top' },
                cell: ({ row }) => row.original.user ?? <span className="text-muted-foreground">System</span>,
            },
            { id: 'event', header: 'Action', meta: { cellClassName: 'align-top' }, cell: ({ row }) => <EventBadge event={row.original.event} /> },
            {
                id: 'record',
                header: 'Record',
                meta: { cellClassName: 'align-top' },
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.record}</div>
                        <div className="text-muted-foreground text-xs">{row.original.record_type}</div>
                    </div>
                ),
            },
            { id: 'changes', header: 'Changes', meta: { cellClassName: 'max-w-md align-top' }, cell: ({ row }) => <Changes entry={row.original} /> },
            {
                id: 'ip',
                header: 'IP',
                meta: { cellClassName: 'text-muted-foreground align-top text-xs whitespace-nowrap' },
                cell: ({ row }) => row.original.ip_address ?? '—',
            },
        ],
        [],
    );

    const renderGridCard = useCallback(
        (entry: ActivityLogEntry) => (
            <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="font-medium">{entry.record}</div>
                        <div className="text-muted-foreground text-xs">{entry.record_type}</div>
                    </div>
                    <EventBadge event={entry.event} />
                </div>
                <Changes entry={entry} />
                <div className="text-muted-foreground flex justify-between gap-2 text-xs">
                    <span className="whitespace-nowrap">{formatDateTime(entry.created_at)}</span>
                    <span className="truncate">{entry.user ?? 'System'}</span>
                </div>
            </div>
        ),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Activity Log" description="কে, কখন, কোন রেকর্ড তৈরি / বদল / মুছেছে — পুরনো এন্ট্রি Business Settings-এর retention অনুযায়ী মুছে যায়" />

                <DataTableToolbar
                    activeFilterCount={activeFilterCount}
                    canReset={canReset}
                    onReset={resetFilters}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput id="from" label="From" type="date" value={filters.from ?? ''} onChange={(e) => applyFilters({ from: e.target.value || null })} className="w-40" />
                            <FormInput id="to" label="To" type="date" value={filters.to ?? ''} onChange={(e) => applyFilters({ to: e.target.value || null })} className="w-40" />

                            <Select value={filters.causer_id ? String(filters.causer_id) : 'all'} onValueChange={(value) => applyFilters({ causer_id: value === 'all' ? null : Number(value) })}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filters.subject_type ?? 'all'} onValueChange={(value) => applyFilters({ subject_type: value === 'all' ? null : value })}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Record type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All record types</SelectItem>
                                    {recordTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filters.event ?? 'all'} onValueChange={(value) => applyFilters({ event: value === 'all' ? null : value })}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All actions</SelectItem>
                                    {EVENTS.map((event) => (
                                        <SelectItem key={event.value} value={event.value}>
                                            {event.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                <DataTable
                    columns={columns}
                    data={activities.data}
                    getRowKey={(entry) => entry.id}
                    renderGridCard={renderGridCard}
                    viewMode={viewMode}
                    loading={isLoading}
                    canReset={canReset}
                    emptyState={<EmptyState title="No activity yet" description="কোনো রেকর্ড তৈরি বা বদল হলে এখানে দেখা যাবে" />}
                    filteredEmptyState={
                        <EmptyState title="No activity matches your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                    footer={
                        <DataTablePagination
                            pagination={activities}
                            perPage={filters.per_page}
                            perPageOptions={shop.pagination_options}
                            allowAll={shop.pagination_allow_all}
                            onPerPageChange={(value) => applyFilters({ per_page: value })}
                            onPageChange={(page) => applyFilters({ page })}
                            itemLabel="entries"
                        />
                    }
                />
            </div>
        </AppLayout>
    );
}
