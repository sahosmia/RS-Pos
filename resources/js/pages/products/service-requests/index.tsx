import ListTable from '@/components/data-table/list-table';
import { FormInput } from '@/components/form/form-input';
import {
    SERVICE_REQUEST_EXPORT_COLUMN_MAP,
    SERVICE_REQUEST_EXPORT_COLUMNS,
    SERVICE_REQUEST_VISIBILITY_COLUMNS,
    useServiceRequestColumns,
} from '@/components/service-requests/service-request-columns';
import { ServiceRequestGridCard } from '@/components/service-requests/service-request-grid-card';
import { UpdateServiceRequestModal } from '@/components/service-requests/update-service-request-modal';
import EmptyState from '@/components/shared/empty-state';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Paginated,
    type ServiceRequestListItem,
    type ServiceRequestStatusValue,
    type ServiceRequestTypeValue,
    type ServiceStaffOption,
} from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { useCallback, useState } from 'react';

interface ServiceRequestFilters extends TableFilterBase {
    status: ServiceRequestStatusValue | null;
    type: ServiceRequestTypeValue | null;
    from: string | null;
    to: string | null;
    per_page: number | 'all';
}

interface ServiceRequestsIndexProps {
    requests: Paginated<ServiceRequestListItem>;
    staff: ServiceStaffOption[];
    filters: ServiceRequestFilters;
}

export default function ServiceRequestsIndex({ requests, staff, filters }: ServiceRequestsIndexProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('serviceRequests', 'title'), href: '/service-requests' }];

    const list = useListPage({
        routeName: 'service-requests.index',
        filters,
        emptyFilters: { status: null, type: null, from: null, to: null },
        rows: requests.data,
        getId: (request) => request.id,
        export: {
            routeName: 'service-requests.export',
            filterKeys: ['status', 'type', 'from', 'to'],
            columnMap: SERVICE_REQUEST_EXPORT_COLUMN_MAP,
        },
    });

    // The request being updated, and the step chosen from its menu.
    const [updating, setUpdating] = useState<{ request: ServiceRequestListItem; preset: ServiceRequestStatusValue | null } | null>(null);
    const openUpdate = useCallback(
        (request: ServiceRequestListItem, preset: ServiceRequestStatusValue | null) => setUpdating({ request, preset }),
        [],
    );

    const columns = useServiceRequestColumns({ selection: list.selection, money, onUpdate: openUpdate });

    const emptyState = (action: React.ReactNode) => (
        <EmptyState title={t('serviceRequests', 'empty_title')} description={t('serviceRequests', 'empty_description')}>
            {action}
        </EmptyState>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('serviceRequests', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    title={t('serviceRequests', 'title')}
                    description={t('serviceRequests', 'description')}
                    actions={
                        <>
                            <Button asChild>
                                <Link href={route('service-requests.create')}>{t('serviceRequests', 'add')}</Link>
                            </Button>
                        </>
                    }
                />

                <ListTable
                    list={list}
                    data={requests}
                    filters={filters}
                    columns={columns}
                    getRowKey={(request) => request.id}
                    renderGridCard={(request) => (
                        <ServiceRequestGridCard
                            request={request}
                            selected={list.selection.isSelected(request.id)}
                            onToggleSelected={(checked) => list.selection.toggle(request.id, checked)}
                            onUpdate={openUpdate}
                        />
                    )}
                    itemLabel="requests"
                    visibilityColumns={SERVICE_REQUEST_VISIBILITY_COLUMNS}
                    exportColumns={SERVICE_REQUEST_EXPORT_COLUMNS}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label={t('serviceRequests', 'from')}
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => list.applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label={t('serviceRequests', 'to')}
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => list.applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />

                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="type">{t('serviceRequests', 'type')}</Label>
                                <Select
                                    value={filters.type ?? 'all'}
                                    onValueChange={(value) =>
                                        list.applyFilters({ type: value === 'all' ? null : (value as ServiceRequestTypeValue) })
                                    }
                                >
                                    <SelectTrigger id="type" className="w-40">
                                        <SelectValue placeholder={t('serviceRequests', 'type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('serviceRequests', 'all_types')}</SelectItem>
                                        <SelectItem value="installation">{t('serviceRequests', 'installation')}</SelectItem>
                                        <SelectItem value="service">{t('serviceRequests', 'service')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="status">{t('serviceRequests', 'status')}</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) =>
                                        list.applyFilters({ status: value === 'all' ? null : (value as ServiceRequestStatusValue) })
                                    }
                                >
                                    <SelectTrigger id="status" className="w-40">
                                        <SelectValue placeholder={t('serviceRequests', 'status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('serviceRequests', 'all_statuses')}</SelectItem>
                                        <SelectItem value="pending">{t('serviceRequests', 'pending')}</SelectItem>
                                        <SelectItem value="scheduled">{t('serviceRequests', 'scheduled')}</SelectItem>
                                        <SelectItem value="completed">{t('serviceRequests', 'completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('serviceRequests', 'cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                    emptyState={emptyState(
                        <Button className="mt-2" asChild>
                            <Link href={route('service-requests.create')}>{t('serviceRequests', 'add')}</Link>
                        </Button>,
                    )}
                    filteredEmptyState={emptyState(
                        <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                            {t('common', 'clear_filters')}
                        </Button>,
                    )}
                />
            </div>

            <UpdateServiceRequestModal
                request={updating?.request ?? null}
                preset={updating?.preset ?? null}
                staff={staff}
                onClose={() => setUpdating(null)}
            />
        </AppLayout>
    );
}
