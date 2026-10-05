import { ACTIVITY_COLUMNS } from '@/components/activity-log/activity-columns';
import { Changes, EventBadge } from '@/components/activity-log/activity-entry-parts';
import ListTable from '@/components/data-table/list-table';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format-date';
import { type BreadcrumbItem } from '@/types';
import { type ActivityLogEntry, type Paginated } from '@/types/models';
import { Head } from '@inertiajs/react';

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

function GridCard({ entry }: { entry: ActivityLogEntry }) {
    return (
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
    );
}

/** Who created, changed or deleted what, and when — newest first. */
export default function ActivityLogIndex({ activities, users, recordTypes, filters }: ActivityLogProps) {
    const list = useListPage({
        routeName: 'activity-log.index',
        filters,
        emptyFilters: { from: null, to: null, causer_id: null, subject_type: null, event: null },
        rows: activities.data,
        getId: (entry) => entry.id,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall
                    title="Activity Log"
                    description="কে, কখন, কোন রেকর্ড তৈরি / বদল / মুছেছে — পুরনো এন্ট্রি Business Settings-এর retention অনুযায়ী মুছে যায়"
                />

                <ListTable
                    list={list}
                    data={activities}
                    filters={filters}
                    columns={ACTIVITY_COLUMNS}
                    getRowKey={(entry) => entry.id}
                    renderGridCard={(entry) => <GridCard entry={entry} />}
                    itemLabel="entries"
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label="From"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => list.applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label="To"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => list.applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <Select
                                value={filters.causer_id ? String(filters.causer_id) : 'all'}
                                onValueChange={(value) => list.applyFilters({ causer_id: value === 'all' ? null : Number(value) })}
                            >
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

                            <Select
                                value={filters.subject_type ?? 'all'}
                                onValueChange={(value) => list.applyFilters({ subject_type: value === 'all' ? null : value })}
                            >
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

                            <Select
                                value={filters.event ?? 'all'}
                                onValueChange={(value) => list.applyFilters({ event: value === 'all' ? null : value })}
                            >
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
                    emptyState={<EmptyState title="No activity yet" description="কোনো রেকর্ড তৈরি বা বদল হলে এখানে দেখা যাবে" />}
                    filteredEmptyState={
                        <EmptyState title="No activity matches your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>
        </AppLayout>
    );
}
